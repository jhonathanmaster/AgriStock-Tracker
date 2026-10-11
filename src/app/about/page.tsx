
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { 
  Sprout, 
  ArrowLeft, 
  Target, 
  Eye, 
  ShieldCheck, 
  Truck, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  ChevronRight,
  Facebook,
  Clock
} from 'lucide-react';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#F6F8ED] flex flex-col">
      {/* HEADER */}
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
          <Link href="/">
            <Button variant="ghost" size="sm" className="font-bold gap-2">
              <ArrowLeft className="w-4 h-4" />
              Ver Catálogo
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="bg-primary text-white py-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
          <div className="container mx-auto px-4 relative z-10 text-center space-y-6">
            <Badge className="bg-white/20 text-white border-none px-4 py-1 uppercase tracking-widest text-[10px] font-bold">Institucional</Badge>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">Impulsando la producción <br/> agrícola del Valle</h2>
            <p className="max-w-2xl mx-auto text-white/80 text-lg md:text-xl">
              Somos <b>GeiaTienda</b>, tu aliado estratégico en nutrición animal, insumos y herramientas para el campo.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-foreground">Nuestra Historia</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Bajo la razón social de <b>Grupo Empresarial Inversiones SAS</b>, GeiaTienda nació con el propósito de tecnificar y facilitar el acceso a insumos de alta calidad para los productores de la región de Borrero Ayerbe y sus alrededores.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Entendemos que el éxito de una granja depende de la calidad de lo que consume su ganado. Por eso, nos hemos especializado en seleccionar los mejores concentrados y herramientas, garantizando resultados medibles para nuestros clientes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden group">
                  <CardContent className="p-8 space-y-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Target className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-xl">Misión</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      Proveer soluciones integrales de nutrición y salud animal, facilitando insumos certificados que potencien la rentabilidad y bienestar de los proyectos agropecuarios.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden group">
                  <CardContent className="p-8 space-y-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                      <Eye className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-xl">Visión</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      Ser el centro de distribución agrícola líder en el suroccidente colombiano, reconocidos por nuestra asesoría técnica y la eficiencia logística en el campo.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-[3rem] rotate-3" />
              <div className="relative bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white aspect-square">
                <Image 
                  src="https://picsum.photos/seed/geiatienda-about/800/800" 
                  alt="Equipo de trabajo GeiaTienda" 
                  fill 
                  className="object-cover"
                  data-ai-hint="farm store"
                />
              </div>
            </div>
          </div>
        </section>

        {/* VALORES */}
        <section className="bg-white py-20 border-y border-border">
          <div className="container mx-auto px-4 text-center space-y-12">
            <div className="space-y-4">
              <h3 className="text-3xl font-black uppercase tracking-widest text-primary">Nuestros Pilares</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">Basamos nuestra operación en principios que garantizan la confianza de quienes nos eligen.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 text-center p-6">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto text-primary">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-xl">Calidad Certificada</h4>
                <p className="text-sm text-muted-foreground">Trabajamos exclusivamente con marcas y laboratorios que cumplen con las normativas de salud animal vigentes.</p>
              </div>
              <div className="space-y-4 text-center p-6">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto text-primary">
                  <Truck className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-xl">Eficiencia Logística</h4>
                <p className="text-sm text-muted-foreground">Entendemos los tiempos del campo. Por eso, optimizamos nuestras entregas para que tus animales nunca se queden sin alimento.</p>
              </div>
              <div className="space-y-4 text-center p-6">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto text-primary">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-xl">Asesoría Técnica</h4>
                <p className="text-sm text-muted-foreground">No solo vendemos productos; brindamos acompañamiento para que elijas el suplemento adecuado para cada etapa productiva.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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
              <li><Link href="/about" className="hover:text-primary transition-colors flex items-center gap-2 font-bold text-primary"><ChevronRight className="w-3 h-3" /> Quiénes Somos</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Contáctenos</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Contacto Directo</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Borrero Ayerbe, Dagua - Valle</p>
              <a href="https://wa.me/573219130614" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-primary hover:underline">
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
