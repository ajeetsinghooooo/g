import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle, Instagram, Headphones } from 'lucide-react';
import { KitchenCruzeLogo } from './KitchenCruzeLogo';
import { useSettings } from '../context/SettingsContext';

interface FooterProps {
  onNavigate: (path: string) => void;
  onOpenSupport?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSupport }) => {
  const { settings, t } = useSettings();

  return (
    <footer id="main-footer" className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & About */}
          <div className="lg:col-span-2 space-y-4">
            <KitchenCruzeLogo variant="light" size="lg" customLogoUrl={settings.logo} onClick={() => onNavigate('/')} />
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              {settings.aboutUs ||
                'Kitchen Cruze delivers freshly crafted gourmet meals with high culinary craftsmanship and lightning-fast delivery.'}
            </p>

            {/* Social / Contact Icons */}
            <div className="flex items-center space-x-3 pt-2">
              {settings.whatsappNumber && (
                <a
                  id="footer-whatsapp-link"
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  id="footer-instagram-link"
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 hover:bg-pink-500 hover:text-white transition"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings.phone && (
                <a
                  id="footer-call-link"
                  href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}
                  className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500 hover:text-white transition"
                  aria-label="Call"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
              {settings.email && (
                <a
                  id="footer-mail-link"
                  href={`mailto:${settings.email}`}
                  className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Customer Navigation */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-amber-400 transition text-slate-400"
                >
                  {t('home')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/menu')}
                  className="hover:text-amber-400 transition text-slate-400"
                >
                  {t('menu')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/offers')}
                  className="hover:text-amber-400 transition text-slate-400"
                >
                  {t('offers')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/wishlist')}
                  className="hover:text-amber-400 transition text-slate-400"
                >
                  {t('wishlist')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/orders')}
                  className="hover:text-amber-400 transition text-slate-400"
                >
                  {t('orders')}
                </button>
              </li>
              <li>
                <button
                  id="footer-support-link"
                  onClick={() => (onOpenSupport ? onOpenSupport() : onNavigate('/support'))}
                  className="hover:text-amber-400 transition text-slate-400 flex items-center space-x-1.5 font-semibold text-amber-500/90 hover:text-amber-400"
                >
                  <Headphones className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customer Support</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Restaurant Location & Hours */}
          <div className="space-y-3 text-sm">
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase">Restaurant Details</h4>
            {settings.address ? (
              <div className="flex items-start space-x-2 text-slate-400">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                <span>{settings.address}</span>
              </div>
            ) : (
              <p className="text-slate-400 text-xs">Cruze Promenade, Near City Center, Mumbai</p>
            )}

            {settings.phone ? (
              <div className="flex items-center space-x-2 text-slate-400">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.phone}</span>
              </div>
            ) : null}

            {settings.openingTime && settings.closingTime ? (
              <div className="flex items-center space-x-2 text-slate-400">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.openingTime} - {settings.closingTime}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
};
