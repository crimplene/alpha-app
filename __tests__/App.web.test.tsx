// Runtime validation coverage for template picking in the browser renderer.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import * as mockReact from 'react';
import type { PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const SafeAreaView = ({
    children,
    onLayout,
    ...props
  }: PropsWithChildren<Record<string, unknown> & { onLayout?: unknown }>) => {
    void onLayout;
    return mockReact.createElement('div', props, children);
  };

  return {
    SafeAreaProvider: ({ children }: PropsWithChildren) =>
      mockReact.createElement(mockReact.Fragment, null, children),
    SafeAreaView,
  };
});

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Circle: () => null,
  Path: () => null,
}));

describe('web template picker', () => {
  it('starts a quiz with a hidden Devanāgarī answer and reveals it on request', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'Quiz mode' }));
    expect(screen.getByLabelText(/^Quiz prompt:/)).toBeTruthy();
    expect(screen.queryByText(/[\u0900-\u097f]/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByLabelText('Answer shown')).toBeTruthy();
    expect(screen.getAllByText(/[\u0900-\u097f]/).length).toBeGreaterThan(0);
  });

  it('restores drawing preferences in a browser session', async () => {
    await AsyncStorage.setItem(
      'drawing-preferences',
      JSON.stringify({ inkColor: '#4577A8', penWidth: 7 }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Ink and pen settings' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Blue ink').firstElementChild?.getAttribute('style')).toContain(
        'rgb(69, 119, 168)',
      );
      expect(screen.getAllByText('Bold')).toHaveLength(2);
    });
  });

  it('opens the picker and applies a selected word template', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose Sanskrit character template' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Words' }));

    expect(screen.getByText('Tracing अहिंसा')).toBeTruthy();
  });
});
