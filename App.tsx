import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  id: number;
  points: (Point | null)[];
};

type Tool = 'draw' | 'erase';

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
  const lastTouchRef = useRef<Point | null>(null);

  const startDrawing = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const point = { x: locationX, y: locationY };
    lastTouchRef.current = point;

    if (tool === 'draw') {
      const nextStrokes = [...strokesRef.current, { id: nextStrokeId.current++, points: [point] }];
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
          point && distanceToSegment(point, start, end) <= ERASER_RADIUS ? null : point,
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

          <View
            style={styles.canvas}
            onStartShouldSetResponder={() => true}
            onResponderGrant={startDrawing}
            onResponderMove={continueDrawing}
            onResponderRelease={stopDrawing}
            onResponderTerminate={stopDrawing}
            accessibilityLabel={tool === 'draw' ? 'Drawing canvas' : 'Eraser canvas'}
          >
            <Svg style={StyleSheet.absoluteFill}>
              {strokes.flatMap((stroke) =>
                splitStroke(stroke).map((segment, segmentIndex) => {
                  if (segment.length === 1) {
                    return (
                      <Circle
                        key={`${stroke.id}-${segmentIndex}`}
                        cx={segment[0].x}
                        cy={segment[0].y}
                        r={2}
                        fill="#27312D"
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
                      stroke="#27312D"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  );
                }),
              )}
            </Svg>
            {strokes.length === 0 && (
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
    marginBottom: 22,
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
