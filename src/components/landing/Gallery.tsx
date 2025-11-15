import { useTranslation } from "react-i18next";

const Gallery = () => {
  const { t } = useTranslation();

  const images = [
    {
      url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=600&fit=crop",
      title: "gallery.reception"
    },
    {
      url: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop",
      title: "gallery.surgery"
    },
    {
      url: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=600&fit=crop",
      title: "gallery.ward"
    },
    {
      url: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=600&fit=crop",
      title: "gallery.diagnostics"
    }
  ];

  return (
    <section id="gallery" className="py-20 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("gallery.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("gallery.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {images.map((image, index) => (
            <div 
              key={index} 
              className="group relative overflow-hidden rounded-lg shadow-elegant hover:shadow-glow transition-all duration-300"
            >
              <img
                src={image.url}
                alt={t(image.title)}
                className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white">{t(image.title)}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
