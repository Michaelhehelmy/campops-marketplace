import { useState } from "react";
import { usePublicSettings, useSubmitInquiry } from "@/hooks/queries/usePublic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useBranding } from "@/contexts/BrandingContext";

export default function ContactPage() {
  const { data: settings } = usePublicSettings();
  const inquiryMutation = useSubmitInquiry();
  const branding = useBranding();

  const [formData, setFormData] = useState({
    guest_name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inquiryMutation.mutateAsync(formData);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-4xl font-serif text-charcoal mb-4">Message Received</h1>
        <p className="text-xl text-charcoal/60 max-w-md">
          Thank you for reaching out to us. Our team will review your message and get back to you
          shortly.
        </p>
        <Button
          variant="outline"
          className="mt-8 rounded-full px-8"
          onClick={() => setSubmitted(false)}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand/30 pb-24">
      {/* Hero Header */}
      <section className="py-20 bg-charcoal text-white text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-serif mb-6">
            {settings?.contact_hero_title || "Connect with Us"}
          </h1>
          <p className="text-xl text-sand/70 max-w-2xl mx-auto">
            {settings?.contact_hero_description ||
              "Have questions about your stay? Planning a special retreat? We're here to help you create your perfect Sinai escape."}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-6 -mt-10">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Information Cards */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardContent className="p-10 space-y-8">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-acacia/10 text-acacia rounded-2xl flex items-center justify-center shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal/40 uppercase tracking-wider mb-1">
                      Email Us
                    </h3>
                    <p className="text-lg font-medium text-charcoal">
                      {settings?.contact_email || branding.contactEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-acacia/10 text-acacia rounded-2xl flex items-center justify-center shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal/40 uppercase tracking-wider mb-1">
                      Call Us
                    </h3>
                    <p className="text-lg font-medium text-charcoal">
                      {settings?.contact_phone || "+20 106 666 4447"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-acacia/10 text-acacia rounded-2xl flex items-center justify-center shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal/40 uppercase tracking-wider mb-1">
                      Visit Us
                    </h3>
                    <p className="text-lg font-medium text-charcoal">
                      {settings?.location_description || "Nuweiba, South Sinai, Egypt"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social / Map Placeholder */}
            <div className="bg-white p-2 rounded-[2.5rem] shadow-lg aspect-square">
              <div className="w-full h-full bg-sand/50 rounded-[2rem] flex flex-col items-center justify-center text-charcoal/30 border border-dashed border-charcoal/20">
                <MapPin size={48} className="mb-4 opacity-20" />
                <p className="font-serif">Interactive Map Unavailable</p>
                <p className="text-sm">Check details in settings</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-2xl rounded-[3rem] p-10 md:p-16">
              <div className="flex items-center gap-3 mb-10">
                <MessageSquare className="text-acacia" size={32} />
                <h2 className="text-3xl font-serif text-charcoal">Send a Message</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-charcoal/60 ml-2">Your Name</label>
                    <Input
                      required
                      placeholder="John Doe"
                      className="h-14 rounded-2xl border-sand bg-sand/20 focus:bg-white transition-all text-lg"
                      value={formData.guest_name}
                      onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-charcoal/60 ml-2">
                      Email Address
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="john@example.com"
                      className="h-14 rounded-2xl border-sand bg-sand/20 focus:bg-white transition-all text-lg"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-charcoal/60 ml-2">
                      Phone (Optional)
                    </label>
                    <Input
                      placeholder="+20 123 456 789"
                      className="h-14 rounded-2xl border-sand bg-sand/20 focus:bg-white transition-all text-lg"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-charcoal/60 ml-2">Subject</label>
                    <Input
                      required
                      placeholder="Reservation inquiry"
                      className="h-14 rounded-2xl border-sand bg-sand/20 focus:bg-white transition-all text-lg"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-charcoal/60 ml-2">
                    Your Message
                  </label>
                  <Textarea
                    required
                    placeholder="Tell us about your plans..."
                    className="min-h-[200px] rounded-3xl border-sand bg-sand/20 focus:bg-white transition-all text-lg pt-5"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={inquiryMutation.isPending}
                  className="w-full md:w-auto rounded-full px-12 h-16 text-xl bg-charcoal text-white hover:bg-black transition-all shadow-xl shadow-charcoal/20 flex items-center gap-3"
                >
                  {inquiryMutation.isPending ? "Sending..." : "Send Message"}
                  <Send size={20} />
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
