import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ShopLayout({ children }) {
  return (<><Header /><main className="container">{children}</main><Footer /></>);
}
