import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Award, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: Target,
      title: "about.mission",
      description: "about.mission.text",
    },
    {
      icon: Award,
      title: "about.values",
      description: "about.values.text",
    },
    {
      icon: Wrench,
      title: "about.equipment",
      description: "about.equipment.text",
    },
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("about.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("about.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-glow transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-hero rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-elegant">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="mb-3 group-hover:text-primary transition-colors">{t(feature.title)}</CardTitle>
                  <CardDescription className="text-base">{t(feature.description)}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;
