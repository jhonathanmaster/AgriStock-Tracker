
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sprout, 
  Send, 
  Mail, 
  User, 
  MessageSquare, 
  ChevronRight, 
  MapPin, 
  Globe, 
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Phone,
  Facebook,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendContactEmail } from '@/server/email/send-contact-email';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function ContactPage() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const result = await sendContactEmail(formData);
      
      if (result.success) {
        setIsSuccess(true);
        toast({ title: "Mensaje Enviado", description: "Nos pondremos en contacto contigo pronto." });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Ocurrió un fallo al intentar enviar el mensaje." });
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted) return <LoadingScreen />;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F6F8ED] flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-none text-center p-8 space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-primary">¡Gracias por escribirnos!</h2>
            <p className="text-muted-foreground">Hemos recibido tu mensaje correctamente. Nuestro equipo revisará tu solicitud y te responderá al correo <b>{formData.email}</b> lo antes posible.</p>
          </div>
          <Button asChild className="w-full h-12 font-bold gap-2">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8ED] flex flex-col">
      {/* CABECERA */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-primary leading-none">GeiaTienda</h1>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Suministros Agrícolas</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <a 
              href="https://wa.me/573219130614" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 mr-4 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-black text-primary">321 913 0614</span>
            </a>
            <Link href="/">
              <Button variant="ghost" size="sm" className="font-bold gap-2">
                <ArrowLeft className="w-4 h-4" />
                Ver Catálogo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-1 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          {/* INFORMACIÓN DE CONTACTO */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1 text-xs font-bold uppercase tracking-widest">
                Atención al Cliente
              </Badge>
              <h2 className="text-4xl font-black tracking-tight text-foreground leading-tight">
                ¿Tienes alguna duda o necesitas un pedido especial?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estamos aquí para ayudarte a impulsar tu producción. Envíanos un mensaje y te brindaremos asesoría personalizada sobre nuestros insumos y herramientas.
              </p>
            </div>

            <div className="space-y-6 bg-white p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Teléfono / WhatsApp</h4>
                  <a href="https://wa.me/573219130614" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                    321 913 0614
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Facebook className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Facebook</h4>
                  <Link 
                    href="https://www.facebook.com/share/1GFxFY1r7J/?mibextid=wwXIfr" 
                    target="_blank"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    GeiaTienda Oficial
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Correo Directo</h4>
                  <p className="text-sm text-muted-foreground">grupoempresarialinversonessas@gmail.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 rounded-xl text-accent">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Ubicación</h4>
                  <p className="text-sm text-muted-foreground">Corregimiento de Borrero Ayerbe Del Municipio de Dagua - Valle</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Cobertura</h4>
                  <p className="text-sm text-muted-foreground">Envíos a todo el territorio nacional</p>
                </div>
              </div>
            </div>
          </div>

          {/* FORMULARIO */}
          <Card className="lg:col-span-3 shadow-2xl border-none overflow-hidden bg-white">
            <CardHeader className="bg-primary text-white p-8">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <MessageSquare className="w-6 h-6" />
                Formulario de Contacto
              </CardTitle>
              <CardDescription className="text-white/80">Completa los campos y nos comunicaremos contigo.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <User className="w-3 h-3" /> Nombre Completo
                    </Label>
                    <Input 
                      id="name" 
                      placeholder="Tu nombre" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required 
                      className="h-12 rounded-xl bg-muted/5 border-muted focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Correo Electrónico
                    </Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="ejemplo@correo.com" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      required 
                      className="h-12 rounded-xl bg-muted/5 border-muted focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs font-bold uppercase text-muted-foreground">Asunto del Mensaje</Label>
                  <Input 
                    id="subject" 
                    placeholder="Ej: Cotización de Concentrados" 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    required 
                    className="h-12 rounded-xl bg-muted/5 border-muted focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs font-bold uppercase text-muted-foreground">Mensaje o Solicitud</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Escribe aquí tu consulta detallada..." 
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    required 
                    className="min-h-[150px] rounded-xl bg-muted/5 border-muted focus-visible:ring-primary resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSending}
                  className="w-full h-14 text-lg font-bold shadow-lg gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando Mensaje...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar Mensaje
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="bg-white border-t border-border py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-primary">GeiaTienda</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gestión profesional de suministros para granjas y proyectos agrícolas. Eficiencia y control desde el inventario hasta la venta.
            </p>
            <div className="flex gap-3">
              <Link 
                href="https://www.facebook.com/share/1GFxFY1r7J/?mibextid=wwXIfr" 
                target="_blank" 
                className="bg-primary/10 p-2 rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                title="Síguenos en Facebook"
              >
                <Facebook className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Inicio / Catálogo</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Quiénes Somos</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Acceso Personal</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Contacto Directo</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Corregimiento de Borrero Ayerbe, Dagua - Valle</p>
              <a 
                href="https://wa.me/573219130614" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 font-bold text-primary hover:underline"
              >
                <Phone className="w-4 h-4" /> 321 913 0614
              </a>
              <p className="flex items-center gap-2 font-bold text-primary"><Mail className="w-4 h-4" /> grupoempresarialinversonessas@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} GeiaTienda Tracker - Gestión Profesional de Inventario
        </div>
      </footer>
    </div>
  );
}
