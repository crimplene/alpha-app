// Runtime validation coverage for drawing, templates, and orientation behavior.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as mockReact from 'react';
import type { PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { loadDrawingPreferences } from '../drawingPreferences';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const SafeAreaView = ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) =>
    mockReact.createElement(
      'safe-area-view',
      { ...props, testID: 'safe-area-view' },
      children,
    );

  return {
    SafeAreaProvider: ({ children }: PropsWithChildren) =>
      mockReact.createElement(mockReact.Fragment, null, children),
    SafeAreaView,
  };
});

jest.mock('react-native-svg', () => {
  const SvgElement = ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) =>
    mockReact.createElement(
      'svg-element',
      {
        ...props,
        testID: 'r' in props ? 'svg-shape' : 'svg-root',
      },
      children,
    );

  return {
    __esModule: true,
    default: SvgElement,
    Circle: SvgElement,
    Path: SvgElement,
  };
});

describe('drawing canvas', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('ignores stored preferences that are not valid drawing options', async () => {
    await AsyncStorage.setItem(
      'drawing-preferences',
      JSON.stringify({ inkColor: '#ffffff', penWidth: 3 }),
    );

    await expect(loadDrawingPreferences()).resolves.toEqual({});
  });

  it('restores selected ink and pen size from a previous session', async () => {
    await AsyncStorage.setItem(
      'drawing-preferences',
      JSON.stringify({ inkColor: '#4577A8', penWidth: 7 }),
    );
    const { getByLabelText } = await render(<App />);
    await fireEvent.press(getByLabelText('Ink and pen settings'));

    await waitFor(() => {
      expect(getByLabelText('Blue ink').props.accessibilityState.checked).toBe(true);
      expect(getByLabelText('Pen thickness').props.accessibilityValue.now).toBe(2);
    });
  });

  it('saves ink and pen size choices for the next session', async () => {
    const { getByLabelText } = await render(<App />);
    await fireEvent.press(getByLabelText('Ink and pen settings'));
    await waitFor(() => expect(getByLabelText('Pen thickness')).toBeTruthy());

    await fireEvent.press(getByLabelText('Blue ink'));
    await fireEvent(getByLabelText('Pen thickness'), 'valueChange', 0);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('drawing-preferences')).toBe(
        JSON.stringify({ inkColor: '#4577A8', penWidth: 2 }),
      );
    });
  });

  it('applies selected ink and pen thickness to a new stroke', async () => {
    const { getByLabelText, getAllByTestId, getAllByText } = await render(<App />);
    await fireEvent.press(getByLabelText('Ink and pen settings'));
    await fireEvent.press(getByLabelText('Blue ink'));
    await fireEvent(getByLabelText('Pen thickness'), 'valueChange', 2);

    expect(getByLabelText('Blue ink').props.accessibilityState.checked).toBe(true);
    expect(getByLabelText('Pen thickness').props.accessibilityValue.now).toBe(2);
    expect(getAllByText('Bold')).toHaveLength(2);

    const canvas = getByLabelText('Drawing canvas');
    await fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 50, touches: [] },
    });
    await fireEvent(canvas, 'responderRelease');

    expect(getAllByTestId('svg-shape')[0].props).toMatchObject({
      fill: '#4577A8',
      r: 3.5,
    });
  });

  it('starts empty and draws and clears a mark', async () => {
    const { getByLabelText, getAllByTestId, queryAllByTestId } = await render(<App />);
    const canvas = getByLabelText('Drawing canvas');
    const clearButton = getByLabelText('Clear drawing');

    expect(clearButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 50, touches: [] },
    });
    await fireEvent(canvas, 'responderRelease');

    expect(clearButton.props.accessibilityState.disabled).toBe(false);
    expect(getAllByTestId('svg-shape')).toHaveLength(1);

    await fireEvent.press(clearButton);
    expect(getByLabelText('Clear drawing').props.accessibilityState.disabled).toBe(true);
    expect(queryAllByTestId('svg-shape')).toHaveLength(0);
  });

  it('selects the eraser tool and removes a touched mark', async () => {
    const { getByLabelText, getByText } = await render(<App />);
    let canvas = getByLabelText('Drawing canvas');

    await fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 50, touches: [] },
    });
    await fireEvent(canvas, 'responderRelease');
    expect(getByLabelText('Clear drawing').props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(getByText('Erase'));
    canvas = getByLabelText('Eraser canvas');
    await fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 50, touches: [] },
    });
    await fireEvent(canvas, 'responderRelease');
    expect(getByLabelText('Clear drawing').props.accessibilityState.disabled).toBe(true);
  });
});

describe('template picker', () => {
  it('keeps the picker full-screen and allows landscape rotation', async () => {
    const { getByLabelText, getByTestId } = await render(<App />);
    await fireEvent.press(getByLabelText('Choose Sanskrit character template'));

    expect(getByTestId('character-picker-modal').props).toMatchObject({
      presentationStyle: 'fullScreen',
      supportedOrientations: [
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ],
    });
  });

  it('switches template sources and updates the canvas guide', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<App />);
    await fireEvent.press(getByLabelText('Choose Sanskrit character template'));
    await fireEvent.press(getByLabelText('Words'));

    expect(queryByText('Choose a template')).toBeNull();
    expect(getByText('अहिंसा')).toBeTruthy();
    await fireEvent(getByLabelText('Drawing canvas'), 'layout', {
      nativeEvent: { layout: { width: 800, height: 600, x: 0, y: 0 } },
    });
    expect(getByText('ahiṃsā')).toBeTruthy();
  });

  it('selects a lesson and displays its first template', async () => {
    const { getByLabelText, getByText } = await render(<App />);
    await fireEvent.press(getByLabelText('Choose Sanskrit character template'));
    await fireEvent.press(getByLabelText('Saṃyuktākṣara'));
    await fireEvent.press(getByLabelText('Choose Sanskrit character template'));
    await fireEvent.press(getByLabelText('Lesson 2, Conjuncts involving र (ra)'));

    expect(getByText('क्र')).toBeTruthy();
    await fireEvent(getByLabelText('Drawing canvas'), 'layout', {
      nativeEvent: { layout: { width: 800, height: 600, x: 0, y: 0 } },
    });
    expect(getByText('kra')).toBeTruthy();
  });

  it('adapts picker navigation to a landscape layout', async () => {
    const { getByLabelText, getAllByTestId, getByTestId } = await render(<App />);

    await fireEvent.press(getByLabelText('Choose Sanskrit character template'));
    const safeAreas = getAllByTestId('safe-area-view');
    await fireEvent(safeAreas[safeAreas.length - 1], 'layout', {
      nativeEvent: { layout: { width: 844, height: 390, x: 0, y: 0 } },
    });
    expect(StyleSheet.flatten(getByTestId('character-picker-body').props.style).flexDirection).toBe(
      'row',
    );
    expect(getByLabelText('Alphabet')).toBeTruthy();
    expect(getByLabelText('Words')).toBeTruthy();
  });
});
