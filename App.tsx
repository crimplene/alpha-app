import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
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
type CharacterSource = 'alphabet' | 'matras' | 'virama' | 'samyuktakshara';
type CharacterTemplate = {
  letter: string;
  transliteration: string;
  components?: string;
};

const INK_COLORS = [
  { name: 'Charcoal', value: '#27312D' },
  { name: 'Blue', value: '#4577A8' },
  { name: 'Red', value: '#C45B4D' },
  { name: 'Green', value: '#548267' },
  { name: 'Gold', value: '#C18A35' },
] as const;
const CHARACTER_GROUPS: { title: string; characters: CharacterTemplate[] }[] = [
  {
    title: 'Vowels',
    characters: [
      { letter: 'अ', transliteration: 'a' },
      { letter: 'आ', transliteration: 'ā' },
      { letter: 'इ', transliteration: 'i' },
      { letter: 'ई', transliteration: 'ī' },
      { letter: 'उ', transliteration: 'u' },
      { letter: 'ऊ', transliteration: 'ū' },
      { letter: 'ऋ', transliteration: 'ṛ' },
      { letter: 'ॠ', transliteration: 'ṝ' },
      { letter: 'ऌ', transliteration: 'ḷ' },
      { letter: 'ॡ', transliteration: 'ḹ' },
      { letter: 'ए', transliteration: 'e' },
      { letter: 'ऐ', transliteration: 'ai' },
      { letter: 'ओ', transliteration: 'o' },
      { letter: 'औ', transliteration: 'au' },
    ],
  },
  {
    title: 'Velar',
    characters: [
      { letter: 'क', transliteration: 'ka' },
      { letter: 'ख', transliteration: 'kha' },
      { letter: 'ग', transliteration: 'ga' },
      { letter: 'घ', transliteration: 'gha' },
      { letter: 'ङ', transliteration: 'ṅa' },
    ],
  },
  {
    title: 'Palatal',
    characters: [
      { letter: 'च', transliteration: 'ca' },
      { letter: 'छ', transliteration: 'cha' },
      { letter: 'ज', transliteration: 'ja' },
      { letter: 'झ', transliteration: 'jha' },
      { letter: 'ञ', transliteration: 'ña' },
    ],
  },
  {
    title: 'Retroflex',
    characters: [
      { letter: 'ट', transliteration: 'ṭa' },
      { letter: 'ठ', transliteration: 'ṭha' },
      { letter: 'ड', transliteration: 'ḍa' },
      { letter: 'ढ', transliteration: 'ḍha' },
      { letter: 'ण', transliteration: 'ṇa' },
    ],
  },
  {
    title: 'Dental',
    characters: [
      { letter: 'त', transliteration: 'ta' },
      { letter: 'थ', transliteration: 'tha' },
      { letter: 'द', transliteration: 'da' },
      { letter: 'ध', transliteration: 'dha' },
      { letter: 'न', transliteration: 'na' },
    ],
  },
  {
    title: 'Labial',
    characters: [
      { letter: 'प', transliteration: 'pa' },
      { letter: 'फ', transliteration: 'pha' },
      { letter: 'ब', transliteration: 'ba' },
      { letter: 'भ', transliteration: 'bha' },
      { letter: 'म', transliteration: 'ma' },
    ],
  },
  {
    title: 'Approximants',
    characters: [
      { letter: 'य', transliteration: 'ya' },
      { letter: 'र', transliteration: 'ra' },
      { letter: 'ल', transliteration: 'la' },
      { letter: 'व', transliteration: 'va' },
    ],
  },
  {
    title: 'Sibilants and other',
    characters: [
      { letter: 'श', transliteration: 'śa' },
      { letter: 'ष', transliteration: 'ṣa' },
      { letter: 'स', transliteration: 'sa' },
      { letter: 'ह', transliteration: 'ha' },
      { letter: 'ळ', transliteration: 'ḷa' },
    ],
  },
];
const MATRA_GROUPS: { title: string; characters: CharacterTemplate[] }[] = [
  {
    title: 'Mātrā (क + vowel sign)',
    characters: [
      { letter: 'का', transliteration: 'kā' },
      { letter: 'कि', transliteration: 'ki' },
      { letter: 'की', transliteration: 'kī' },
      { letter: 'कु', transliteration: 'ku' },
      { letter: 'कू', transliteration: 'kū' },
      { letter: 'कृ', transliteration: 'kṛ' },
      { letter: 'कॄ', transliteration: 'kṝ' },
      { letter: 'कॢ', transliteration: 'kḷ' },
      { letter: 'कॣ', transliteration: 'kḹ' },
      { letter: 'के', transliteration: 'ke' },
      { letter: 'कै', transliteration: 'kai' },
      { letter: 'को', transliteration: 'ko' },
      { letter: 'कौ', transliteration: 'kau' },
    ],
  },
];
const VIRAMA_GROUPS: { title: string; characters: CharacterTemplate[] }[] = [
  {
    title: 'Consonants with Virāma (no vowel)',
    characters: [
      { letter: 'क्', transliteration: 'k' },
      { letter: 'ख्', transliteration: 'kh' },
      { letter: 'ग्', transliteration: 'g' },
      { letter: 'घ्', transliteration: 'gh' },
      { letter: 'ङ्', transliteration: 'ṅ' },
      { letter: 'च्', transliteration: 'c' },
      { letter: 'छ्', transliteration: 'ch' },
      { letter: 'ज्', transliteration: 'j' },
      { letter: 'झ्', transliteration: 'jh' },
      { letter: 'ञ्', transliteration: 'ñ' },
      { letter: 'ट्', transliteration: 'ṭ' },
      { letter: 'ठ्', transliteration: 'ṭh' },
      { letter: 'ड्', transliteration: 'ḍ' },
      { letter: 'ढ्', transliteration: 'ḍh' },
      { letter: 'ण्', transliteration: 'ṇ' },
      { letter: 'त्', transliteration: 't' },
      { letter: 'थ्', transliteration: 'th' },
      { letter: 'द्', transliteration: 'd' },
      { letter: 'ध्', transliteration: 'dh' },
      { letter: 'न्', transliteration: 'n' },
      { letter: 'प्', transliteration: 'p' },
      { letter: 'फ्', transliteration: 'ph' },
      { letter: 'ब्', transliteration: 'b' },
      { letter: 'भ्', transliteration: 'bh' },
      { letter: 'म्', transliteration: 'm' },
      { letter: 'य्', transliteration: 'y' },
      { letter: 'र्', transliteration: 'r' },
      { letter: 'ल्', transliteration: 'l' },
      { letter: 'व्', transliteration: 'v' },
      { letter: 'श्', transliteration: 'ś' },
      { letter: 'ष्', transliteration: 'ṣ' },
      { letter: 'स्', transliteration: 's' },
      { letter: 'ह्', transliteration: 'h' },
      { letter: 'ळ्', transliteration: 'ḷ' },
    ],
  },
];
const SAMYUKTAKSHARA_GROUPS: {
  title: string;
  characters: CharacterTemplate[];
}[] = [
  {
    title: 'Important and common conjuncts',
    characters: [
      { letter: 'क्ष', transliteration: 'kṣa', components: 'क् + ष' },
      { letter: 'त्र', transliteration: 'tra', components: 'त् + र' },
      { letter: 'ज्ञ', transliteration: 'jña', components: 'ज् + ञ' },
      { letter: 'श्र', transliteration: 'śra', components: 'श् + र' },
      { letter: 'क्त', transliteration: 'kta', components: 'क् + त' },
      { letter: 'त्त', transliteration: 'tta', components: 'त् + त' },
      { letter: 'द्ध', transliteration: 'ddha', components: 'द् + ध' },
      { letter: 'द्य', transliteration: 'dya', components: 'द् + य' },
      { letter: 'द्व', transliteration: 'dva', components: 'द् + व' },
      { letter: 'त्व', transliteration: 'tva', components: 'त् + व' },
    ],
  },
  {
    title: 'Conjuncts involving र (ra)',
    characters: [
      { letter: 'क्र', transliteration: 'kra', components: 'क् + र' },
      { letter: 'ग्र', transliteration: 'gra', components: 'ग् + र' },
      { letter: 'प्र', transliteration: 'pra', components: 'प् + र' },
      { letter: 'ब्र', transliteration: 'bra', components: 'ब् + र' },
      { letter: 'द्र', transliteration: 'dra', components: 'द् + र' },
      { letter: 'भ्र', transliteration: 'bhra', components: 'भ् + र' },
      { letter: 'फ्र', transliteration: 'phra', components: 'फ् + र' },
      { letter: 'व्र', transliteration: 'vra', components: 'व् + र' },
      { letter: 'र्क', transliteration: 'rka', components: 'र् + क' },
      { letter: 'र्म', transliteration: 'rma', components: 'र् + म' },
    ],
  },
  {
    title: 'Nasal consonant combinations',
    characters: [
      { letter: 'न्त', transliteration: 'nta', components: 'न् + त' },
      { letter: 'न्द', transliteration: 'nda', components: 'न् + द' },
      { letter: 'न्ध', transliteration: 'ndha', components: 'न् + ध' },
      { letter: 'न्न', transliteration: 'nna', components: 'न् + न' },
      { letter: 'म्प', transliteration: 'mpa', components: 'म् + प' },
      { letter: 'म्ब', transliteration: 'mba', components: 'म् + ब' },
      { letter: 'म्भ', transliteration: 'mbha', components: 'म् + भ' },
      { letter: 'ङ्क', transliteration: 'ṅka', components: 'ङ् + क' },
      { letter: 'ङ्ग', transliteration: 'ṅga', components: 'ङ् + ग' },
      { letter: 'ञ्च', transliteration: 'ñca', components: 'ञ् + च' },
    ],
  },
  {
    title: 'Conjuncts involving स, श and ष',
    characters: [
      { letter: 'स्त', transliteration: 'sta', components: 'स् + त' },
      { letter: 'स्थ', transliteration: 'stha', components: 'स् + थ' },
      { letter: 'स्न', transliteration: 'sna', components: 'स् + न' },
      { letter: 'स्म', transliteration: 'sma', components: 'स् + म' },
      { letter: 'स्व', transliteration: 'sva', components: 'स् + व' },
      { letter: 'स्क', transliteration: 'ska', components: 'स् + क' },
      { letter: 'श्च', transliteration: 'śca', components: 'श् + च' },
      { letter: 'श्न', transliteration: 'śna', components: 'श् + न' },
      { letter: 'ष्ट', transliteration: 'ṣṭa', components: 'ष् + ट' },
      { letter: 'ष्ठ', transliteration: 'ṣṭha', components: 'ष् + ठ' },
    ],
  },
  {
    title: 'Other useful conjuncts',
    characters: [
      { letter: 'च्च', transliteration: 'cca', components: 'च् + च' },
      { letter: 'च्छ', transliteration: 'ccha', components: 'च् + छ' },
      { letter: 'ज्ज', transliteration: 'jja', components: 'ज् + ज' },
      { letter: 'त्न', transliteration: 'tna', components: 'त् + न' },
      { letter: 'त्म', transliteration: 'tma', components: 'त् + म' },
      { letter: 'त्य', transliteration: 'tya', components: 'त् + य' },
      { letter: 'न्य', transliteration: 'nya', components: 'न् + य' },
      { letter: 'प्य', transliteration: 'pya', components: 'प् + य' },
      { letter: 'ल्ल', transliteration: 'lla', components: 'ल् + ल' },
      { letter: 'स्त्र', transliteration: 'stra', components: 'स् + त् + र' },
    ],
  },
];
const CHARACTER_SOURCES: Record<
  CharacterSource,
  { title: string; groups: { title: string; characters: CharacterTemplate[] }[] }
> = {
  alphabet: { title: 'Alphabet', groups: CHARACTER_GROUPS },
  matras: { title: 'Mātrā', groups: MATRA_GROUPS },
  virama: { title: 'Virāma', groups: VIRAMA_GROUPS },
  samyuktakshara: {
    title: 'Saṃyuktākṣara',
    groups: SAMYUKTAKSHARA_GROUPS,
  },
};
const PEN_THICKNESSES = [
  { label: 'Fine', width: 2 },
  { label: 'Medium', width: 4 },
  { label: 'Bold', width: 7 },
] as const;
const DRAW_POINT_SPACING = 3;
const ERASER_RADIUS = 12;
const VOWEL_SWIPE_DISTANCE = 72;
const DRAW_GESTURE_DISTANCE = 6;

const getTouchCenter = (event: GestureResponderEvent): Point | null => {
  const { touches } = event.nativeEvent;
  if (touches.length < 2) return null;

  return {
    x: touches.reduce((total, touch) => total + touch.pageX, 0) / touches.length,
    y: touches.reduce((total, touch) => total + touch.pageY, 0) / touches.length,
  };
};

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
  const [showDrawingControls, setShowDrawingControls] = useState(false);
  const [guideCharacter, setGuideCharacter] = useState<string | null>(null);
  const [characterSource, setCharacterSource] = useState<CharacterSource>('alphabet');
  const [selectedConjunctLesson, setSelectedConjunctLesson] = useState(0);
  const [isCharacterPickerVisible, setCharacterPickerVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const lastTouchRef = useRef<Point | null>(null);
  const gestureStartRef = useRef<Point | null>(null);
  const gestureModeRef = useRef<
    'pending' | 'draw' | 'erase' | 'navigate' | 'navigated' | null
  >(null);
  const isComplexGuide =
    characterSource === 'matras' || characterSource === 'samyuktakshara';
  const guideFontSize = Math.min(
    canvasSize.width * (isComplexGuide ? 0.62 : 1.22),
    canvasSize.height * (isComplexGuide ? 0.68 : 0.76),
  );
  const selectedThicknessIndex = PEN_THICKNESSES.findIndex(({ width }) => width === penWidth);
  const activeCharacterGroups =
    characterSource === 'samyuktakshara'
      ? [SAMYUKTAKSHARA_GROUPS[selectedConjunctLesson]]
      : CHARACTER_SOURCES[characterSource].groups;
  const activeCharacters = activeCharacterGroups.flatMap(({ characters }) => characters);
  const guideTransliteration = activeCharacters.find(
    ({ letter }) => letter === guideCharacter,
  )?.transliteration;

  const startDrawing = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const point = { x: locationX, y: locationY };
    gestureStartRef.current = point;
    lastTouchRef.current = point;
    gestureModeRef.current = 'pending';
  };

  const startTwoFingerNavigation = (event: GestureResponderEvent) => {
    const center = getTouchCenter(event);
    if (!center || guideCharacter === null || gestureModeRef.current !== 'pending') return;

    gestureStartRef.current = center;
    lastTouchRef.current = null;
    gestureModeRef.current = 'navigate';
  };

  const beginStroke = (point: Point) => {
    const nextStrokes = [
      ...strokesRef.current,
      { id: nextStrokeId.current++, color: inkColor, width: penWidth, points: [point] },
    ];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  };

  const continueDrawing = (event: GestureResponderEvent) => {
    const mode = gestureModeRef.current;
    const gestureStart = gestureStartRef.current;
    if (!mode || !gestureStart || mode === 'navigated') return;

    if (mode === 'navigate') {
      const center = getTouchCenter(event);
      if (!center) return;

      const deltaX = center.x - gestureStart.x;
      const deltaY = center.y - gestureStart.y;
      if (
        Math.abs(deltaX) >= VOWEL_SWIPE_DISTANCE &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.5
      ) {
        gestureModeRef.current = 'navigated';
        changeGuideBySwipe(deltaX < 0 ? 1 : -1);
      }
      return;
    }

    const previousPoint = lastTouchRef.current;
    if (!previousPoint) return;

    const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    let activeMode = mode;

    if (mode === 'pending') {
      const deltaX = point.x - gestureStart.x;
      const deltaY = point.y - gestureStart.y;

      if (Math.hypot(deltaX, deltaY) < DRAW_GESTURE_DISTANCE) return;

      activeMode = tool;
      gestureModeRef.current = activeMode;
      if (activeMode === 'draw') beginStroke(gestureStart);
    }

    if (activeMode === 'erase') {
      eraseAlong(previousPoint, point);
      lastTouchRef.current = point;
      return;
    }

    const currentStrokes = strokesRef.current;
    const currentStroke = currentStrokes[currentStrokes.length - 1];
    if (!currentStroke) return;

    const nextStrokes = [
      ...currentStrokes.slice(0, -1),
      {
        ...currentStroke,
        points: [
          ...currentStroke.points,
          ...interpolatePoints(previousPoint, point, DRAW_POINT_SPACING),
        ],
      },
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

  const selectGuideCharacter = (letter: string) => {
    clearCanvas();
    setGuideCharacter(letter);
    setCharacterPickerVisible(false);
  };

  const changeGuideBySwipe = (direction: 1 | -1) => {
    const currentIndex = activeCharacters.findIndex(({ letter }) => letter === guideCharacter);
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : activeCharacters.length - 1
        : (currentIndex + direction + activeCharacters.length) % activeCharacters.length;
    selectGuideCharacter(activeCharacters[nextIndex].letter);
  };

  const stopDrawing = () => {
    if (gestureModeRef.current === 'pending' && gestureStartRef.current) {
      if (tool === 'draw') {
        beginStroke(gestureStartRef.current);
      } else {
        eraseAlong(gestureStartRef.current, gestureStartRef.current);
      }
    }
    gestureModeRef.current = null;
    gestureStartRef.current = null;
    lastTouchRef.current = null;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.brandIcon}
              resizeMode="cover"
              accessible
              accessibilityLabel="Akshara app icon"
            />
            <Text style={styles.brand}>PAPER</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>A little line drawing</Text>
            <Text style={styles.subtitle}>Just you, a line, and a blank page.</Text>
          </View>

          <View style={styles.drawingControlsPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ink and pen settings"
              accessibilityHint={showDrawingControls ? 'Collapse drawing settings' : 'Expand drawing settings'}
              accessibilityState={{ expanded: showDrawingControls }}
              onPress={() => setShowDrawingControls((expanded) => !expanded)}
              style={({ pressed }) => [
                styles.drawingControlsHeader,
                pressed && styles.colorOptionPressed,
              ]}
            >
              <Text style={styles.drawingControlsTitle}>Ink & pen</Text>
              <View style={styles.drawingControlsSummary}>
                <View style={[styles.summarySwatch, { backgroundColor: inkColor }]} />
                <Text style={styles.summaryText}>
                  {PEN_THICKNESSES[selectedThicknessIndex].label}
                </Text>
                <Text style={styles.disclosureIcon}>{showDrawingControls ? '−' : '+'}</Text>
              </View>
            </Pressable>
            {showDrawingControls && (
              <View style={styles.drawingControlsContent}>
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
                      {PEN_THICKNESSES.map(({ label, width }) => (
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
              </View>
            )}
          </View>

          <View style={styles.guideToolbar}>
            <View style={styles.guideHeader}>
              <View>
                <Text style={styles.guideTitle}>Sanskrit characters</Text>
                <Text style={styles.guideSubtitle}>
                  {guideCharacter === null
                    ? 'Choose a character to trace'
                    : `Tracing ${guideCharacter}`}
                </Text>
              </View>
              <View style={styles.guideActions}>
                {guideCharacter !== null && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Hide character guide"
                    onPress={() => setGuideCharacter(null)}
                    style={({ pressed }) => [
                      styles.hideGuideButton,
                      pressed && styles.vowelButtonPressed,
                    ]}
                  >
                    <Text style={styles.hideGuideText}>Hide</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose Sanskrit character template"
                  accessibilityHint="Opens the character picker grouped by character type."
                  onPress={() => setCharacterPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.chooseCharacterButton,
                    pressed && styles.vowelButtonPressed,
                  ]}
                >
                  <Text style={styles.chooseCharacterText}>
                    {guideCharacter ?? 'Choose'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Modal
            animationType="slide"
            visible={isCharacterPickerVisible}
            onRequestClose={() => setCharacterPickerVisible(false)}
          >
            <SafeAreaView style={styles.characterPickerScreen}>
              <View style={styles.characterPickerHeader}>
                <View>
                  <Text style={styles.characterPickerTitle}>Choose a character</Text>
                  <Text style={styles.characterPickerSubtitle}>
                    {characterSource === 'alphabet'
                      ? 'Choose an alphabet character to trace'
                      : characterSource === 'matras'
                        ? 'Choose a vowel sign attached to क'
                        : characterSource === 'virama'
                          ? 'Choose a consonant without its inherent vowel'
                          : 'Choose a conjunct to trace'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close character picker"
                  onPress={() => setCharacterPickerVisible(false)}
                  style={({ pressed }) => [
                    styles.hideGuideButton,
                    pressed && styles.vowelButtonPressed,
                  ]}
                >
                  <Text style={styles.hideGuideText}>Close</Text>
                </Pressable>
              </View>
              <View
                style={styles.characterSourceSelector}
                accessibilityRole="radiogroup"
                accessibilityLabel="Template source"
              >
                {(['alphabet', 'matras', 'virama', 'samyuktakshara'] as const).map((source) => {
                  const selected = characterSource === source;
                  return (
                    <Pressable
                      key={source}
                      accessibilityRole="radio"
                      accessibilityLabel={CHARACTER_SOURCES[source].title}
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        setCharacterSource(source);
                        const firstCharacter =
                          source === 'samyuktakshara'
                            ? SAMYUKTAKSHARA_GROUPS[0].characters[0]
                            : CHARACTER_SOURCES[source].groups[0].characters[0];
                        setGuideCharacter(firstCharacter.letter);
                        if (source === 'samyuktakshara') setSelectedConjunctLesson(0);
                        clearCanvas();
                      }}
                      style={({ pressed }) => [
                        styles.characterSourceButton,
                        selected && styles.selectedCharacterSourceButton,
                        pressed && styles.vowelButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.characterSourceText,
                          selected && styles.selectedCharacterSourceText,
                        ]}
                      >
                        {CHARACTER_SOURCES[source].title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {characterSource === 'matras' && (
                <Text style={styles.matraNote}>
                  The inherent vowel अ has no separate Mātrā sign.
                </Text>
              )}
              {characterSource === 'virama' && (
                <Text style={styles.matraNote}>
                  Virāma (्) removes the inherent vowel from each consonant.
                </Text>
              )}
              {characterSource === 'samyuktakshara' && (
                <Text style={styles.matraNote}>
                  Each tile shows the conjunct, its components, and IAST transliteration.
                </Text>
              )}
              <ScrollView
                contentContainerStyle={styles.characterGroups}
                accessibilityLabel={`${CHARACTER_SOURCES[characterSource].title} templates`}
              >
                {characterSource === 'samyuktakshara' && (
                  <View
                    style={styles.lessonSection}
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Saṃyuktākṣara lessons"
                  >
                    <Text style={styles.characterGroupTitle}>Choose a lesson</Text>
                    <View style={styles.lessonGrid}>
                      {SAMYUKTAKSHARA_GROUPS.map((group, index) => {
                        const selected = selectedConjunctLesson === index;
                        return (
                          <Pressable
                            key={group.title}
                            accessibilityRole="radio"
                            accessibilityLabel={`Lesson ${index + 1}: ${group.title}`}
                            accessibilityState={{ checked: selected }}
                            onPress={() => {
                              setSelectedConjunctLesson(index);
                              setGuideCharacter(group.characters[0].letter);
                              clearCanvas();
                            }}
                            style={({ pressed }) => [
                              styles.lessonOption,
                              selected && styles.selectedLessonOption,
                              pressed && styles.vowelButtonPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.lessonNumber,
                                selected && styles.selectedLessonText,
                              ]}
                            >
                              LESSON {index + 1}
                            </Text>
                            <Text
                              style={[
                                styles.lessonTitle,
                                selected && styles.selectedLessonText,
                              ]}
                              numberOfLines={2}
                            >
                              {group.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
                {activeCharacterGroups.map(({ title, characters }) => (
                  <View key={title} style={styles.characterGroup}>
                    <Text style={styles.characterGroupTitle}>{title}</Text>
                    <View style={styles.characterGrid}>
                      {characters.map(({ letter, transliteration, components }) => {
                        const selected = guideCharacter === letter;
                        return (
                          <Pressable
                            key={letter}
                            accessibilityRole="radio"
                            accessibilityLabel={`${transliteration}, ${letter}${components ? `, components ${components}` : ''}`}
                            accessibilityState={{ checked: selected }}
                            onPress={() => selectGuideCharacter(letter)}
                            style={({ pressed }) => [
                              styles.characterOption,
                              characterSource === 'samyuktakshara' &&
                                styles.conjunctCharacterOption,
                              selected && styles.selectedCharacterOption,
                              pressed && styles.vowelButtonPressed,
                            ]}
                          >
                            <Text style={styles.characterOptionLetter}>{letter}</Text>
                            <Text style={styles.characterOptionTransliteration}>
                              {transliteration}
                            </Text>
                            {components && (
                              <Text style={styles.characterOptionComponents}>
                                {components}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Modal>

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
            onResponderStart={startTwoFingerNavigation}
            onResponderMove={continueDrawing}
            onResponderRelease={stopDrawing}
            onResponderTerminate={stopDrawing}
            accessibilityLabel={tool === 'draw' ? 'Drawing canvas' : 'Eraser canvas'}
            accessibilityHint="Use one finger to draw or erase. With a character selected, use two fingers to swipe to another character."
          >
            {guideCharacter !== null && guideFontSize > 0 && (
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
                  {guideCharacter}
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
            {strokes.length === 0 && guideCharacter === null && (
              <View pointerEvents="none" style={styles.canvasHint}>
                <View style={styles.hintIcon}>
                  <View style={styles.hintLine} />
                </View>
                <Text style={styles.hintText}>
                  {tool === 'draw'
                  ? 'One finger to draw · two fingers to change template'
                  : 'One finger to erase · two fingers to change template'}
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
    backgroundColor: '#F4EFE4',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
  drawingControlsPanel: {
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#ECEDE8',
    overflow: 'hidden',
  },
  drawingControlsHeader: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawingControlsTitle: {
    color: '#53655A',
    fontSize: 12,
    fontWeight: '600',
  },
  drawingControlsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summarySwatch: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  summaryText: {
    color: '#7E877F',
    fontSize: 11,
  },
  disclosureIcon: {
    width: 18,
    color: '#53655A',
    textAlign: 'right',
    fontSize: 17,
    lineHeight: 20,
  },
  drawingControlsContent: {
    paddingHorizontal: 12,
    paddingBottom: 6,
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
    minHeight: 48,
    marginBottom: 10,
  },
  guideHeader: {
    minHeight: 48,
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
  guideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  chooseCharacterButton: {
    minWidth: 54,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#DDE8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseCharacterText: {
    color: '#394A3F',
    fontSize: 21,
    fontWeight: '600',
  },
  vowelButtonPressed: {
    opacity: 0.7,
  },
  characterPickerScreen: {
    flex: 1,
    backgroundColor: '#F4F4F0',
  },
  characterPickerHeader: {
    minHeight: 76,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6DF',
  },
  characterPickerTitle: {
    color: '#26312B',
    fontSize: 20,
    fontWeight: '600',
  },
  characterPickerSubtitle: {
    color: '#858B84',
    fontSize: 13,
    marginTop: 4,
  },
  characterSourceSelector: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#E9ECE6',
    gap: 4,
  },
  characterSourceButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCharacterSourceButton: {
    backgroundColor: '#FFFEFC',
  },
  characterSourceText: {
    color: '#7E877F',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCharacterSourceText: {
    color: '#394A3F',
  },
  matraNote: {
    paddingHorizontal: 22,
    paddingTop: 10,
    color: '#858B84',
    fontSize: 12,
  },
  characterGroups: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 20,
  },
  lessonSection: {
    gap: 10,
  },
  lessonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  lessonOption: {
    width: '48.5%',
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: '#FFFEFC',
    borderWidth: 1,
    borderColor: '#E8E8E2',
    justifyContent: 'center',
    gap: 4,
  },
  selectedLessonOption: {
    backgroundColor: '#DDE8DD',
    borderColor: '#9EAF9F',
  },
  lessonNumber: {
    color: '#929790',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  lessonTitle: {
    color: '#53655A',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedLessonText: {
    color: '#394A3F',
  },
  characterGroup: {
    gap: 10,
  },
  characterGroupTitle: {
    color: '#53655A',
    fontSize: 14,
    fontWeight: '600',
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  characterOption: {
    width: '18%',
    minHeight: 68,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFEFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E2',
  },
  conjunctCharacterOption: {
    width: '31%',
    minHeight: 82,
  },
  selectedCharacterOption: {
    backgroundColor: '#DDE8DD',
    borderColor: '#9EAF9F',
  },
  characterOptionLetter: {
    color: '#39443E',
    fontSize: 24,
    lineHeight: 32,
  },
  characterOptionTransliteration: {
    color: '#858B84',
    fontSize: 10,
  },
  characterOptionComponents: {
    color: '#929790',
    fontSize: 9,
    marginTop: 2,
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
