
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sprout, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Navigation as NavigationIcon,
  ShieldCheck,
  Clock as ClockIcon,
  Facebook,
  Share2,
  Package as PackageIcon,
  Map as MapIcon,
  DollarSign as DollarSignIcon,
  Send
} from 'lucide-react';
import { api, RequestError } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import placeholderData from '@/app/lib/placeholder-images.json';

export default function PublicTransportPage() {
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    origin: '',
    destination: '',
    cargoDescription: '',
    preferredDate: ''
  });

  const heroImage = placeholderData.placeholderImages.find(img => img.id === 'transport-hero-truck');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.origin || !formData.destination) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor completa la información obligatoria." });
      return;
    }

    setIsSubmitting(true);
    try {
      // The server saves the customer and the request (visitors don't need an account).
      await api('POST', '/api/public/transport-requests', formData);

      setIsSuccess(true);
      toast({ title: "Solicitud Enviada", description: "Nos comunicaremos contigo pronto para la cotización." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof RequestError && error.status < 500 ? error.message : "No se pudo procesar tu solicitud. Intenta más tarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return <LoadingScreen />;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F6F8ED] flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-none text-center p-8 space-y-6 rounded-[2.5rem]">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-primary">¡Solicitud Recibida!</h2>
            <p className="text-muted-foreground">Hemos registrado tu requerimiento de transporte. Un asesor de <b>GeiaTienda</b> te contactará al teléfono <b>{formData.customerPhone}</b> para coordinar los detalles y el precio del flete.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full h-12 font-bold gap-2 rounded-xl">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Volver al Inicio
              </Link>
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-xl border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5" asChild>
               <a href={`https://wa.me/573219130614?text=Hola,%20solicité%20un%20servicio%20de%20transporte%20desde%20${formData.origin}%20hasta%20${formData.destination}.`} target="_blank">
                 WhatsApp Directo
               </a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8ED] flex flex-col">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-primary leading-none">GeiaTienda</h1>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Logística & Carga</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden sm:block">
              <Button variant="ghost" className="font-bold">Catálogo</Button>
            </Link>
            <Link href="/transporte">
              <Button variant="default" className="font-bold bg-primary shadow-md">Solicitar Flete</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative h-[400px] md:h-[500px] flex items-center overflow-hidden text-white">
          <Image 
            src={heroImage?.imageUrl || "https://picsum.photos/seed/trans-log-hero/1920/1080"} 
            alt="Transporte Logístico" 
            fill 
            className="object-cover" 
            priority
            data-ai-hint={heroImage?.imageHint || "logistics truck"}
            unoptimized
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="container mx-auto px-4 relative z-10 space-y-6">
            <Badge className="bg-accent text-white border-none px-4 py-1 uppercase tracking-widest text-[10px] font-bold">Servicio Profesional</Badge>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-3xl">
              Llevamos tus insumos <br/> a donde los necesites.
            </h2>
            <p className="max-w-xl text-white/80 text-lg md:text-xl">
              Servicio de transporte especializado para el sector agrícola. Confiabilidad, seguridad y puntualidad en cada entrega.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 -mt-12 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-xl rounded-3xl p-6 bg-white flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-lg">Gran Capacidad</h4>
                <p className="text-xs text-muted-foreground">Contamos con camiones de hasta 6 toneladas para bultos y carga pesada.</p>
              </div>
            </Card>
            <Card className="border-none shadow-xl rounded-3xl p-6 bg-white flex items-center gap-4">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
                <MapIcon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-lg">Cobertura Regional</h4>
                <p className="text-xs text-muted-foreground">Despachos desde Borrero Ayerbe hacia todo el departamento y el país.</p>
              </div>
            </Card>
            <Card className="border-none shadow-xl rounded-3xl p-6 bg-white flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-lg">Carga Protegida</h4>
                <p className="text-xs text-muted-foreground">Manejo cuidadoso de concentrados y animales con personal experto.</p>
              </div>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-foreground">¿Cómo funciona nuestro servicio?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  En <b>GeiaTienda</b> entendemos que la logística es el corazón de la producción agrícola. No solo vendemos los mejores insumos, sino que garantizamos que lleguen a su granja o bodega en el menor tiempo posible.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { title: "Solicitud en Línea", desc: "Completa el formulario con los puntos de origen y destino.", icon: NavigationIcon },
                  { title: "Cotización Rápida", desc: "Nuestro equipo calcula el flete y te envía el precio vía WhatsApp o Email.", icon: DollarSignIcon },
                  { title: "Programación", desc: "Acordamos la fecha y hora de carga que más te convenga.", icon: ClockIcon },
                  { title: "Entrega y Seguimiento", desc: "Llevamos tu carga y te notificamos cuando llegue a su destino.", icon: PackageIcon },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold shrink-0 shadow-md">
                      {i + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <step.icon className="w-4 h-4 text-primary" />
                         <h4 className="font-bold text-foreground">{step.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-accent/5 rounded-3xl border border-accent/10">
                <p className="text-sm italic text-accent font-medium">
                  "Nuestro compromiso es que tus animales nunca se queden sin alimento por retrasos en el transporte. Eficiencia pura en el campo."
                </p>
              </div>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
              <CardHeader className="bg-primary text-white p-8">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <NavigationIcon className="w-6 h-6" />
                  Solicitar Cotización de Flete
                </CardTitle>
                <CardDescription className="text-white/80">Ingresa los datos del viaje y un asesor te contactará.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName" className="text-xs font-bold uppercase text-muted-foreground">Nombre Completo *</Label>
                        <Input 
                          id="customerName" 
                          placeholder="Tu nombre" 
                          value={formData.customerName}
                          onChange={e => setFormData({...formData, customerName: e.target.value})}
                          required 
                          className="h-12 rounded-xl bg-muted/30 border-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone" className="text-xs font-bold uppercase text-muted-foreground">Teléfono *</Label>
                        <Input 
                          id="customerPhone" 
                          placeholder="321..." 
                          value={formData.customerPhone}
                          onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                          required 
                          className="h-12 rounded-xl bg-muted/30 border-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="origin" className="text-xs font-bold uppercase text-muted-foreground">Origen (Carga) *</Label>
                        <Input 
                          id="origin" 
                          placeholder="Ciudad / Municipio" 
                          value={formData.origin}
                          onChange={e => setFormData({...formData, origin: e.target.value})}
                          required 
                          className="h-12 rounded-xl bg-muted/30 border-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destination" className="text-xs font-bold uppercase text-muted-foreground">Destino (Entrega) *</Label>
                        <Input 
                          id="destination" 
                          placeholder="Ciudad / Municipio" 
                          value={formData.destination}
                          onChange={e => setFormData({...formData, destination: e.target.value})}
                          required 
                          className="h-12 rounded-xl bg-muted/30 border-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferredDate" className="text-xs font-bold uppercase text-muted-foreground">Fecha Estimada</Label>
                      <Input 
                        id="preferredDate" 
                        type="date"
                        value={formData.preferredDate}
                        onChange={e => setFormData({...formData, preferredDate: e.target.value})}
                        className="h-12 rounded-xl bg-muted/30 border-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cargoDescription" className="text-xs font-bold uppercase text-muted-foreground">Descripción de la Carga</Label>
                      <Textarea 
                        id="cargoDescription" 
                        placeholder="Ej: 80 bultos de maíz, herramientas, ganado (especificar cantidad)..." 
                        value={formData.cargoDescription}
                        onChange={e => setFormData({...formData, cargoDescription: e.target.value})}
                        className="min-h-[100px] rounded-xl bg-muted/30 border-none resize-none"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg font-bold shadow-lg gap-3 rounded-2xl hover:scale-[1.02] transition-transform"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando solicitud...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar Solicitud de Cotización
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-border py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-primary">GeiaTienda</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Soluciones integrales de transporte y suministro para el campo. Potenciamos tu rentabilidad con logística eficiente.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Enlaces del Portal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Inicio / Catálogo</Link></li>
              <li><Link href="/transporte" className="hover:text-primary transition-colors flex items-center gap-2 font-bold text-primary"><ChevronRight className="w-3 h-3" /> Servicios de Transporte</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Quiénes Somos</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Soporte Técnico</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Contacto Directo</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium"><MapPin className="w-4 h-4 text-primary" /> Borrero Ayerbe, Dagua - Valle</p>
              <a href="https://wa.me/573219130614" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-primary hover:underline">
                <Phone className="w-4 h-4" /> 321 913 0614
              </a>
              <p className="flex items-center gap-2 font-bold text-primary"><Mail className="w-4 h-4" /> grupoempresarialinversonessas@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} GeiaTienda Tracker - Gestión Profesional de Logística
        </div>
      </footer>
    </div>
  );
}
