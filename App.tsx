import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

type Point = {
  x: number;
  y: number;
};

type CanvasSize = {
  width: number;
  height: number;
};

type Stroke = {
  id: number;
  color: string;
  width: number;
  points: (Point | null)[];
};

type Tool = 'draw' | 'erase';

const INK_COLORS = [
  { name: 'Charcoal', value: '#27312D' },
  { name: 'Blue', value: '#4577A8' },
  { name: 'Red', value: '#C45B4D' },
  { name: 'Green', value: '#548267' },
  { name: 'Gold', value: '#C18A35' },
] as const;
const SANSKRIT_VOWELS = [
  { letter: 'अ', name: 'a' },
  { letter: 'आ', name: 'ā' },
  { letter: 'इ', name: 'i' },
  { letter: 'ई', name: 'ī' },
  { letter: 'उ', name: 'u' },
  { letter: 'ऊ', name: 'ū' },
  { letter: 'ऋ', name: 'ṛ' },
  { letter: 'ॠ', name: 'ṝ' },
  { letter: 'ऌ', name: 'ḷ' },
  { letter: 'ॡ', name: 'ḹ' },
  { letter: 'ए', name: 'e' },
  { letter: 'ऐ', name: 'ai' },
  { letter: 'ओ', name: 'o' },
  { letter: 'औ', name: 'au' },
] as const;
const PEN_THICKNESSES = [
  { label: 'Fine', width: 2 },
  { label: 'Medium', width: 4 },
  { label: 'Bold', width: 7 },
] as const;
const DRAW_POINT_SPACING = 3;
const ERASER_RADIUS = 12;

const interpolatePoints = (start: Point, end: Point, spacing: number): Point[] => {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const steps = Math.max(1, Math.ceil(distance / spacing));

  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };
  });
};

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + progress * dx), point.y - (start.y + progress * dy));
};

const splitStroke = (stroke: Stroke): Point[][] => {
  const segments: Point[][] = [];
  let segment: Point[] = [];

  stroke.points.forEach((point) => {
    if (point) {
      segment.push(point);
    } else if (segment.length > 0) {
      segments.push(segment);
      segment = [];
    }
  });

  if (segment.length > 0) segments.push(segment);
  return segments;
};

export default function App() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const nextStrokeId = useRef(0);
  const [tool, setTool] = useState<Tool>('draw');
  const [inkColor, setInkColor] = useState<string>(INK_COLORS[0].value);
  const [penWidth, setPenWidth] = useState<number>(PEN_THICKNESSES[1].width);
  const [guideVowel, setGuideVowel] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const lastTouchRef = useRef<Point | null>(null);
  const guideFontSize = Math.min(canvasSize.width * 1.22, canvasSize.height * 0.76);
  const selectedThicknessIndex = PEN_THICKNESSES.findIndex(({ width }) => width === penWidth);
  const guideTransliteration = SANSKRIT_VOWELS.find(
    ({ letter }) => letter === guideVowel,
  )?.name;

  const startDrawing = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const point = { x: locationX, y: locationY };
    lastTouchRef.current = point;

    if (tool === 'draw') {
      const nextStrokes = [
        ...strokesRef.current,
        { id: nextStrokeId.current++, color: inkColor, width: penWidth, points: [point] },
      ];
      strokesRef.current = nextStrokes;
      setStrokes(nextStrokes);
    } else {
      eraseAlong(point, point);
    }
  };

  const continueDrawing = (event: GestureResponderEvent) => {
    const previousPoint = lastTouchRef.current;
    if (!previousPoint) return;

    const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    if (tool === 'erase') {
      eraseAlong(previousPoint, point);
      lastTouchRef.current = point;
      return;
    }

    const currentStrokes = strokesRef.current;
    const currentStroke = currentStrokes[currentStrokes.length - 1];
    if (!currentStroke) return;

    const nextStrokes = [
      ...currentStrokes.slice(0, -1),
      { ...currentStroke, points: [...currentStroke.points, ...interpolatePoints(previousPoint, point, DRAW_POINT_SPACING)] },
    ];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
    lastTouchRef.current = point;
  };

  const eraseAlong = (start: Point, end: Point) => {
    const nextStrokes = strokesRef.current
      .map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) =>
          point &&
          distanceToSegment(point, start, end) <= ERASER_RADIUS + stroke.width / 2
            ? null
            : point,
        ),
      }))
      .filter((stroke) => stroke.points.some((point) => point !== null));
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    setStrokes([]);
  };

  const stopDrawing = () => {
    lastTouchRef.current = null;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <View style={styles.brandLine} />
            </View>
            <Text style={styles.brand}>PAPER</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>A little line drawing</Text>
            <Text style={styles.subtitle}>Just you, a line, and a blank page.</Text>
          </View>

          <View style={styles.colorPicker}>
            <Text style={styles.colorLabel}>Ink</Text>
            <View style={styles.colorOptions}>
              {INK_COLORS.map((color) => {
                const selected = inkColor === color.value;
                return (
                  <Pressable
                    key={color.value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${color.name} ink`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => setInkColor(color.value)}
                    style={({ pressed }) => [
                      styles.colorOption,
                      selected && styles.selectedColorOption,
                      pressed && styles.colorOptionPressed,
                    ]}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: color.value }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.thicknessPicker}>
            <Text style={styles.colorLabel}>Pen</Text>
            <View style={styles.thicknessSliderArea}>
              <Slider
                accessibilityRole="adjustable"
                accessibilityLabel="Pen thickness"
                accessibilityHint="Swipe up or down to change between Fine, Medium, and Bold."
                accessibilityValue={{
                  min: 0,
                  max: PEN_THICKNESSES.length - 1,
                  now: selectedThicknessIndex,
                  text: PEN_THICKNESSES[selectedThicknessIndex].label,
                }}
                minimumValue={0}
                maximumValue={PEN_THICKNESSES.length - 1}
                step={1}
                value={selectedThicknessIndex}
                onValueChange={(value) =>
                  setPenWidth(PEN_THICKNESSES[Math.round(value)].width)
                }
                minimumTrackTintColor="#758B79"
                maximumTrackTintColor="#D8DDD5"
                thumbTintColor="#526D5D"
                style={styles.thicknessSlider}
              />
              <View style={styles.thicknessLabels}>
                {PEN_THICKNESSES.map(({ label, width }, index) => (
                  <Text
                    key={label}
                    style={[
                      styles.thicknessLabel,
                      penWidth === width && styles.activeThicknessLabel,
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.guideToolbar}>
            <View style={styles.guideHeader}>
              <View>
                <Text style={styles.guideTitle}>Sanskrit vowels</Text>
                <Text style={styles.guideSubtitle}>Choose a letter to trace</Text>
              </View>
              {guideVowel !== null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Hide letter guide"
                  onPress={() => setGuideVowel(null)}
                  style={({ pressed }) => [
                    styles.hideGuideButton,
                    pressed && styles.vowelButtonPressed,
                  ]}
                >
                  <Text style={styles.hideGuideText}>Hide</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.vowelOptions}
              accessibilityRole="radiogroup"
              accessibilityLabel="Sanskrit vowel guides"
            >
              {SANSKRIT_VOWELS.map(({ letter, name }) => {
                const selected = guideVowel === letter;
                return (
                  <Pressable
                    key={letter}
                    accessibilityRole="radio"
                    accessibilityLabel={`${name}, ${letter}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      clearCanvas();
                      setGuideVowel(letter);
                    }}
                    style={({ pressed }) => [
                      styles.vowelButton,
                      selected && styles.selectedVowelButton,
                      pressed && styles.vowelButtonPressed,
                    ]}
                  >
                    <Text style={[styles.vowelText, selected && styles.selectedVowelText]}>
                      {letter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.scrollHint}>‹  Swipe left or right for more  ›</Text>
          </View>

          <View
            style={styles.canvas}
            onLayout={({ nativeEvent }) =>
              setCanvasSize({
                width: nativeEvent.layout.width,
                height: nativeEvent.layout.height,
              })
            }
            onStartShouldSetResponder={() => true}
            onResponderGrant={startDrawing}
            onResponderMove={continueDrawing}
            onResponderRelease={stopDrawing}
            onResponderTerminate={stopDrawing}
            accessibilityLabel={tool === 'draw' ? 'Drawing canvas' : 'Eraser canvas'}
          >
            {guideVowel !== null && guideFontSize > 0 && (
              <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
                <SvgText
                  x="50%"
                  y="50%"
                  fontSize={guideFontSize}
                  fontFamily="sans-serif"
                  fill="none"
                  stroke="#718477"
                  strokeWidth={1.6}
                  strokeDasharray="8 8"
                  opacity={0.5}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {guideVowel}
                </SvgText>
                {guideTransliteration && (
                  <SvgText
                    x="94%"
                    y="91%"
                    fontSize={20}
                    fontFamily="sans-serif"
                    fill="#718477"
                    opacity={0.75}
                    textAnchor="end"
                    alignmentBaseline="central"
                  >
                    {guideTransliteration}
                  </SvgText>
                )}
              </Svg>
            )}
            <Svg style={StyleSheet.absoluteFill}>
              {strokes.flatMap((stroke) =>
                splitStroke(stroke).map((segment, segmentIndex) => {
                  if (segment.length === 1) {
                    return (
                      <Circle
                        key={`${stroke.id}-${segmentIndex}`}
                        cx={segment[0].x}
                        cy={segment[0].y}
                        r={stroke.width / 2}
                        fill={stroke.color}
                      />
                    );
                  }
                  const path = segment
                    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
                    .join(' ');
                  return (
                    <Path
                      key={`${stroke.id}-${segmentIndex}`}
                      d={path}
                      stroke={stroke.color}
                      strokeWidth={stroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  );
                }),
              )}
            </Svg>
            {strokes.length === 0 && guideVowel === null && (
              <View pointerEvents="none" style={styles.canvasHint}>
                <View style={styles.hintIcon}>
                  <View style={styles.hintLine} />
                </View>
                <Text style={styles.hintText}>
                  {tool === 'draw' ? 'Drag your finger to draw' : 'Drag over a line to erase'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.toolSelector} accessibilityRole="tablist">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tool === 'draw' }}
                onPress={() => setTool('draw')}
                style={({ pressed }) => [
                  styles.toolButton,
                  tool === 'draw' && styles.activeToolButton,
                  pressed && styles.toolButtonPressed,
                ]}
              >
                <Text style={[styles.toolText, tool === 'draw' && styles.activeToolText]}>Draw</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tool === 'erase' }}
                onPress={() => setTool('erase')}
                style={({ pressed }) => [
                  styles.toolButton,
                  tool === 'erase' && styles.activeToolButton,
                  pressed && styles.toolButtonPressed,
                ]}
              >
                <Text style={[styles.toolText, tool === 'erase' && styles.activeToolText]}>Erase</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear drawing"
              accessibilityState={{ disabled: strokes.length === 0 }}
              disabled={strokes.length === 0}
              onPress={clearCanvas}
              style={({ pressed }) => [
                styles.clearButton,
                strokes.length === 0 && styles.clearButtonDisabled,
                pressed && strokes.length > 0 && styles.clearButtonPressed,
              ]}
            >
              <Text style={[styles.clearIcon, strokes.length === 0 && styles.disabledText]}>×</Text>
              <Text style={[styles.clearText, strokes.length === 0 && styles.disabledText]}>Clear</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F4F0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#DDE8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLine: {
    width: 15,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#526D5D',
    transform: [{ rotate: '-35deg' }],
  },
  brand: {
    color: '#526D5D',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  heading: {
    marginTop: 30,
    marginBottom: 12,
  },
  title: {
    color: '#26312B',
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#858B84',
    fontSize: 14,
    marginTop: 6,
  },
  colorPicker: {
    minHeight: 40,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  colorLabel: {
    color: '#858B84',
    fontSize: 12,
    fontWeight: '600',
  },
  colorOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorOption: {
    borderColor: '#B9C6B9',
  },
  colorOptionPressed: {
    opacity: 0.7,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  thicknessPicker: {
    minHeight: 48,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thicknessSliderArea: {
    flex: 1,
    maxWidth: 250,
  },
  thicknessSlider: {
    width: '100%',
    height: 32,
  },
  thicknessLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: -4,
  },
  thicknessLabel: {
    color: '#929790',
    fontSize: 10,
  },
  activeThicknessLabel: {
    color: '#394A3F',
    fontWeight: '600',
  },
  guideToolbar: {
    minHeight: 102,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  guideHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideTitle: {
    color: '#39443E',
    fontSize: 13,
    fontWeight: '600',
  },
  guideSubtitle: {
    color: '#929790',
    fontSize: 11,
    marginTop: 3,
  },
  hideGuideButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E9ECE6',
  },
  hideGuideText: {
    color: '#53655A',
    fontSize: 12,
    fontWeight: '600',
  },
  vowelOptions: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 4,
  },
  scrollHint: {
    alignSelf: 'center',
    color: '#929790',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  vowelButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9ECE6',
  },
  selectedVowelButton: {
    backgroundColor: '#DDE8DD',
    borderWidth: 1,
    borderColor: '#9EAF9F',
  },
  vowelButtonPressed: {
    opacity: 0.7,
  },
  vowelText: {
    color: '#53655A',
    fontSize: 21,
    lineHeight: 29,
  },
  selectedVowelText: {
    color: '#394A3F',
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    minHeight: 220,
    backgroundColor: '#FFFEFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8E8E2',
    overflow: 'hidden',
  },
  canvasHint: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hintIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#F3F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintLine: {
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#A6ADA4',
    transform: [{ rotate: '-35deg' }],
  },
  hintText: {
    color: '#A0A49D',
    fontSize: 13,
  },
  footer: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#E9ECE6',
    gap: 2,
  },
  toolButton: {
    height: 38,
    minWidth: 70,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToolButton: {
    backgroundColor: '#FFFEFC',
  },
  toolButtonPressed: {
    opacity: 0.7,
  },
  toolText: {
    color: '#7E877F',
    fontSize: 13,
    fontWeight: '600',
  },
  activeToolText: {
    color: '#394A3F',
  },
  clearButton: {
    height: 42,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: '#E9ECE6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearButtonDisabled: {
    backgroundColor: '#ECEDE9',
  },
  clearButtonPressed: {
    opacity: 0.7,
  },
  clearIcon: {
    color: '#53655A',
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '400',
  },
  clearText: {
    color: '#53655A',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledText: {
    color: '#B8BCB5',
  },
});
