import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";

const Team = () => {
  const { t } = useTranslation();

  const team = [
    {
      name: "Др. Алексей Иванов",
      nameUz: "Dr. Aleksey Ivanov",
      nameEn: "Dr. Alexey Ivanov",
      position: "team.position.head",
      experience: "20",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop"
    },
    {
      name: "Др. Мария Петрова",
      nameUz: "Dr. Mariya Petrova",
      nameEn: "Dr. Maria Petrova",
      position: "team.position.surgeon",
      experience: "15",
      image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop"
    },
    {
      name: "Др. Сергей Волков",
      nameUz: "Dr. Sergey Volkov",
      nameEn: "Dr. Sergey Volkov",
      position: "team.position.therapist",
      experience: "12",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop"
    },
    {
      name: "Анна Смирнова",
      nameUz: "Anna Smirnova",
      nameEn: "Anna Smirnova",
      position: "team.position.nurse",
      experience: "10",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop"
    }
  ];

  return (
    <section id="team" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("team.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("team.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <Card key={index} className="group hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="relative mb-4 overflow-hidden rounded-lg">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-primary font-medium mb-3">{t(member.position)}</p>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span className="text-sm">{member.experience} {t("team.experience")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
