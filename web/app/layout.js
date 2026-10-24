import './globals.css';
import { CartProvider } from '@/lib/cart';

export const metadata = {
  title: 'An Thư Jewelry — Trang sức vàng, kim cương',
  description: 'Hệ thống bán hàng trang sức xây dựng trên PostgreSQL',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
