import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Syringe, Microscope, Heart, Hospital, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";

const Services = () => {
  const { t } = useTranslation();
  
  const services = [
    {
      icon: Stethoscope,
      title: "services.consultation",
      description: "services.consultation.desc",
    },
    {
      icon: Syringe,
      title: "services.surgery",
      description: "services.surgery.desc",
    },
    {
      icon: Microscope,
      title: "services.diagnostics",
      description: "services.diagnostics.desc",
    },
    {
      icon: Heart,
      title: "services.vaccination",
      description: "services.vaccination.desc",
    },
    {
      icon: Hospital,
      title: "services.hospitalization",
      description: "services.hospitalization.desc",
    },
    {
      icon: Scissors,
      title: "services.grooming",
      description: "services.grooming.desc",
    },
  ];

  return (
    <section id="services" className="py-20 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("services.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("services.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-glow transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-hero rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-elegant">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="mb-2 group-hover:text-primary transition-colors">{t(service.title)}</CardTitle>
                  <CardDescription>{t(service.description)}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
