import { Phone, Mail, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import elvetLogo from "@/assets/elvet_logo.jpg";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer id="contact" className="bg-muted/30 border-t py-12">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={elvetLogo} alt="ELVET" className="w-12 h-12 rounded-xl object-cover shadow-glow border border-white/30" />
              <div>
                <h3 className="text-lg font-bold">ELVET</h3>
                <p className="text-xs text-muted-foreground">Забота о питомцах</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Профессиональная ветеринарная помощь для ваших любимцев
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Phone className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <div>+998 90 123 45 67</div>
                  <div className="text-muted-foreground">Круглосуточно</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Mail className="w-4 h-4 text-primary mt-0.5" />
                <div>info@elvet.uz</div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <div>г. Ташкент, ул. Примерная, 123</div>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Режим работы</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Понедельник - Пятница</span>
                <span className="font-medium">24/7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Суббота - Воскресенье</span>
                <span className="font-medium">24/7</span>
              </div>
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-xs font-medium text-primary">
                  🚑 Экстренная помощь доступна круглосуточно
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 ELVET. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
