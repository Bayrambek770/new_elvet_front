import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Requests } from "@/lib/api";

const Contact = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    message: ""
  });

  // Reuse login page approach: Uzbek number mask and strict validation
  const normalizePhone = (val: string) => {
    const digits = (val || "").replace(/\D/g, "");
    let rest = digits;
    if (rest.startsWith("998")) rest = rest.slice(3);
    rest = rest.slice(0, 9);
    return rest.length ? `+998${rest}` : "";
  };

  const formatUzPhoneMasked = (val: string) => {
    const digits = (val || "").replace(/\D/g, "");
    let rest = digits;
    if (rest.startsWith("998")) rest = rest.slice(3);
    const s1 = rest.slice(0, 2);
    const s2 = rest.slice(2, 5);
    const s3 = rest.slice(5, 7);
    const s4 = rest.slice(7, 9);
    if (!s1 && !s2 && !s3 && !s4) return "";
    let out = "+998";
    if (s1) out += `-${s1}`;
    if (s2) out += `-${s2}`;
    if (s3) out += `-${s3}`;
    if (s4) out += `-${s4}`;
    return out;
  };

  // Phone validation regex - matches +998-XX-XXX-XX-XX format
  const phoneRegex = /^\+998-\d{2}-\d{3}-\d{2}-\d{2}$/;

  const validatePhone = (value: string): boolean => {
    return phoneRegex.test(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUzPhoneMasked(e.target.value);
    setFormData({ ...formData, phone: formatted });
    
    // Clear custom validity when user types
    if (phoneInputRef.current) {
      phoneInputRef.current.setCustomValidity("");
    }
  };

  const handlePhoneInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;
    
    // Custom validation for Safari compatibility
    if (!validatePhone(value)) {
      input.setCustomValidity(t("contacts.form.phoneInvalid") || "Please enter a valid phone number in format +998-XX-XXX-XX-XX");
    } else {
      input.setCustomValidity("");
    }
  };

  const nameRegex = /^[A-Za-zА-Яа-яЁё' -]{2,64}$/;

  const isValid =
    nameRegex.test(formData.firstName.trim()) &&
    nameRegex.test(formData.lastName.trim()) &&
    validatePhone(formData.phone) &&
    formData.message.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      const normalized = normalizePhone(formData.phone);
      if (!nameRegex.test(formData.firstName) || !nameRegex.test(formData.lastName)) {
        throw new Error(t("contacts.form.invalidName"));
      }

      // Send to backend
      await Requests.create({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone_number: normalized,
        description: formData.message.trim(),
      });

      toast({
        title: t("contacts.form.success"),
        description: t("contacts.form.successDesc"),
      });

      // Reset form
      setFormData({ firstName: "", lastName: "", phone: "", message: "" });
    } catch (error: any) {
      toast({
        title: t("contacts.form.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacts" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("contacts.form.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("contacts.form.subtitle")}
          </p>
        </div>

        <Card className="max-w-2xl mx-auto shadow-elegant border-2 hover:shadow-glow transition-all">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">
                  {t("contacts.form.phone")} *
                </Label>
                <Input
                  ref={phoneInputRef}
                  id="phone"
                  type="tel"
                  placeholder={"+998-XX-XXX-XX-XX"}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onInvalid={handlePhoneInvalid}
                  required
                  pattern="^\+998-\d{2}-\d{3}-\d{2}-\d{2}$"
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  {t("contacts.form.phoneHelper")}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-base">
                    {t("contacts.form.firstName")} *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t("contacts.form.firstNamePlaceholder")}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    pattern="^[A-Za-zА-Яа-яЁё' -]{2,64}$"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-base">
                    {t("contacts.form.lastName")} *
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder={t("contacts.form.lastNamePlaceholder")}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    pattern="^[A-Za-zА-Яа-яЁё' -]{2,64}$"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-base">
                  {t("contacts.form.message")}
                </Label>
                <Textarea
                  id="message"
                  placeholder={t("contacts.form.messagePlaceholder")}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  minLength={5}
                  maxLength={2000}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t("contacts.form.messageHelper")}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base gap-2"
                disabled={loading || !isValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("contacts.form.sending")}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {t("contacts.form.submit")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-12 rounded-lg overflow-hidden shadow-elegant">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d748.7947369906695!2d69.24738420371841!3d41.28476924888345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae8b3188c46a11%3A0xe8a28e934c4fc1ca!2sVeterinarnaya%20Klinika%20Elvet!5e1!3m2!1sen!2s!4v1763212746721!5m2!1sen!2s"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
};

export default Contact;
