import './globals.css';

export const metadata = {
  title: 'Local Top Spot — Who owns the Lowcountry?',
  description:
    'Charleston businesses bid themselves onto the board. Their customers boost them. The top spot wins the featured panel on next month printed card.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
