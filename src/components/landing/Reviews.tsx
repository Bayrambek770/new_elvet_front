import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const Reviews = () => {
  const { t } = useTranslation();

  const reviews = [
    {
      name: "Ольга Кузнецова",
      nameUz: "Olga Kuznetsova",
      nameEn: "Olga Kuznetsova",
      pet: "Кот Мурзик",
      petUz: "Mushuk Murzik",
      petEn: "Cat Murzik",
      text: "Огромное спасибо врачам клиники! Спасли моего кота после сложной операции. Профессионализм на высшем уровне!",
      textUz: "Klinika shifokorlariga katta rahmat! Qiyin operatsiyadan keyin mushugimni saqlab qolishdi. Professionallik eng yuqori darajada!",
      textEn: "Huge thanks to the clinic doctors! They saved my cat after a difficult operation. Professionalism at the highest level!",
      rating: 5
    },
    {
      name: "Дмитрий Соколов",
      nameUz: "Dmitriy Sokolov",
      nameEn: "Dmitry Sokolov",
      pet: "Собака Рекс",
      petUz: "It Reks",
      petEn: "Dog Rex",
      text: "Отличная клиника! Современное оборудование, внимательные врачи. Рекс чувствует себя прекрасно после лечения.",
      textUz: "Ajoyib klinika! Zamonaviy jihozlar, e'tiborli shifokorlar. Reks davolanishdan keyin o'zini ajoyib his qiladi.",
      textEn: "Excellent clinic! Modern equipment, attentive doctors. Rex feels great after treatment.",
      rating: 5
    },
    {
      name: "Елена Морозова",
      nameUz: "Yelena Morozova",
      nameEn: "Elena Morozova",
      pet: "Кошка Люся",
      petUz: "Mushuk Lyusya",
      petEn: "Cat Lucy",
      text: "Круглосуточная работа - это спасение! Ночью попали с Люсей на экстренный приём, всё прошло отлично.",
      textUz: "24 soatlik ish - bu najot! Lyusya bilan tunda shoshilinch qabulga bordik, hammasi ajoyib bo'ldi.",
      textEn: "24-hour operation is a lifesaver! We came with Lucy for emergency care at night, everything went great.",
      rating: 5
    }
  ];

  return (
    <section id="reviews" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("reviews.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("reviews.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {reviews.map((review, index) => (
            <Card key={index} className="hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{review.text}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold">{review.name}</p>
                  <p className="text-sm text-muted-foreground">{review.pet}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
