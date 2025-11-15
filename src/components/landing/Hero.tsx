import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Stethoscope, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import heroImage from "@/assets/hero-vet.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-20 md:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">{t("hero.badge")}</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
            {t("hero.subtitle")}
          </p>
          
          {/* Removed quick access test links */}
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="text-lg bg-gradient-hero hover:shadow-glow transition-all"
              onClick={() => document.getElementById("contacts")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Calendar className="w-5 h-5 mr-2" />
              {t("hero.appointment")}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg border-2"
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Stethoscope className="w-5 h-5 mr-2" />
              {t("hero.services")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">15+</div>
              <div className="text-sm text-muted-foreground">{t("hero.stats.experience")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">5000+</div>
              <div className="text-sm text-muted-foreground">{t("hero.stats.clients")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">{t("hero.stats.support")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
