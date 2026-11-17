import AsyncStorage from '@react-native-async-storage/async-storage';

export const INK_COLORS = [
  { name: 'Charcoal', value: '#27312D' },
  { name: 'Blue', value: '#4577A8' },
  { name: 'Red', value: '#C45B4D' },
  { name: 'Green', value: '#548267' },
  { name: 'Gold', value: '#C18A35' },
] as const;

export const PEN_THICKNESSES = [
  { label: 'Fine', width: 2 },
  { label: 'Medium', width: 4 },
  { label: 'Bold', width: 7 },
] as const;

export type DrawingPreferences = {
  inkColor: string;
  penWidth: number;
};

const STORAGE_KEY = 'drawing-preferences';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const loadDrawingPreferences = async (): Promise<Partial<DrawingPreferences>> => {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
  if (storedValue === null) return {};

  const parsed: unknown = JSON.parse(storedValue);
  if (!isRecord(parsed)) return {};

  const result: Partial<DrawingPreferences> = {};

  if (
    typeof parsed.inkColor === 'string' &&
    INK_COLORS.some(({ value }) => value === parsed.inkColor)
  ) {
    result.inkColor = parsed.inkColor;
  }

  if (
    typeof parsed.penWidth === 'number' &&
    PEN_THICKNESSES.some(({ width }) => width === parsed.penWidth)
  ) {
    result.penWidth = parsed.penWidth;
  }

  return result;
};

export const saveDrawingPreferences = (preferences: DrawingPreferences) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
