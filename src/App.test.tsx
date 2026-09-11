import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders CONVERTLY link', () => {
  render(<App />);
  const linkElement = screen.getByText(/CONVERTLY/i);
  expect(linkElement).toBeInTheDocument();
});
