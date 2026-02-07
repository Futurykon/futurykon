import { useState } from "react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award, 
  Globe, 
  Code, 
  CreditCard, 
  Trophy,
  MessageSquare,
  Twitter,
  Linkedin,
  Github,
  ChevronDown,
  BarChart3,
  Calendar,
  Brain,
  Zap
} from "lucide-react";
import { AuthDialog } from "@/components/auth/AuthDialog";

const Index = () => {
  const [joinOpen, setJoinOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const howItWorksSteps = [
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "Analizuj trendy AI",
      description: "Publikuj prognozy o rozwoju sztucznej inteligencji"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Przewiduj przełomy",
      description: "Oceniaj prawdopodobieństwo kluczowych osiągnięć AI"
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      title: "Buduj reputację",
      description: "Zdobywaj punkty za trafne prognozy technologiczne"
    }
  ];

  const benefits = [
    {
      title: "Eksperci AI",
      description: "Społeczność badaczy i praktyków AI",
      icon: <Brain className="w-6 h-6 text-primary" />
    },
    {
      title: "Dane w czasie rzeczywistym",
      description: "Aktualne trendy i metryki rozwoju AI",
      icon: <BarChart3 className="w-6 h-6 text-primary" />
    },
    {
      title: "Bezpłatne prognozy",
      description: "Dostęp do wszystkich prognoz bez opłat",
      icon: <Zap className="w-6 h-6 text-primary" />
    },
    {
      title: "Ranking ekspertów",
      description: "Leaderboard najlepszych prognostów AI",
      icon: <Trophy className="w-6 h-6 text-primary" />
    }
  ];

  const applications = [
    {
      category: "AGI",
      example: "Czy AGI zostanie osiągnięte przed 2030 rokiem?",
      probability: 31,
      timeLeft: "1,825 dni",
      image: "photo-1526374965328-7f61d4dc18c5"
    },
    {
      category: "Modele językowe",
      example: "Czy GPT-5 przekroczy 100 bilionów parametrów?",
      probability: 67,
      timeLeft: "456 dni",
      image: "photo-1677442136019-21780ecad995"
    },
    {
      category: "Robotyka",
      example: "Czy roboty humanoidalne będą masowo dostępne do 2028?",
      probability: 42,
      timeLeft: "892 dni",
      image: "photo-1546776230-bb86256870ce"
    },
    {
      category: "Autonomiczne pojazdy",
      example: "Czy w Polsce pojawią się autonomiczne taksówki do 2027?",
      probability: 73,
      timeLeft: "734 dni",
      image: "photo-1549317661-bd32c8ce0db2"
    },
    {
      category: "AI w medycynie",
      example: "Czy AI odkryje nowy lek przeciwnowotworowy do 2026?",
      probability: 84,
      timeLeft: "365 dni",
      image: "photo-1559757148-5c350d0d3c56"
    }
  ];

  const testimonials = [
    {
      name: "Dr Anna K.",
      avatar: "AK",
      content: "Jako badaczka ML mogę wreszcie dzielić się przewidywaniami o przyszłości AI z polską społecznością!"
    },
    {
      name: "Michał Z.",
      avatar: "MZ", 
      content: "Pracuję w AI i Futurykon pomaga śledzić trendy. Świetne źródło zbiorowej mądrości ekspertów."
    },
    {
      name: "Katarzyna W.",
      avatar: "KW",
      content: "Dzięki prognozom AI lepiej planuję swoją karierę w tech. Wiem, gdzie inwestować czas."
    }
  ];

  const teamMembers = [
    {
      name: "Jan Kowalski",
      role: "CEO & Founder",
      avatar: "JK",
      linkedin: "#"
    },
    {
      name: "Anna Nowak",
      role: "CTO",
      avatar: "AN", 
      linkedin: "#"
    },
    {
      name: "Piotr Wiśniewski",
      role: "Head of Research",
      avatar: "PW",
      linkedin: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-charcoal via-primary to-navy bg-clip-text text-transparent">
              Przewiduj rozwój AI.<br />Kształtuj przyszłość technologii.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 font-serif max-w-3xl mx-auto">
              Dołącz do polskiego rynku prognoz AI Futurykon, gdzie eksperci przewidują przyszłość sztucznej inteligencji.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105" onClick={() => setJoinOpen(true)}>
                Dołącz do Futurykon
              </Button>
              <AuthDialog open={joinOpen} onOpenChange={setJoinOpen} title="Zarejestruj się w Futurykon" />

              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl" asChild>
                  <a href="/questions">Rób predykcje</a>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl" asChild>
                  <a href="/ask">Zadaj pytanie</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Jak to działa</h2>
            <p className="text-xl text-muted-foreground font-serif">Trzy proste kroki do lepszych prognoz</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorksSteps.map((step, index) => (
              <Card key={index} className="text-center p-8 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardContent className="p-0">
                  <div className="mb-6 flex justify-center">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground font-serif">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Utra */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Dlaczego Futurykon?</h2>
            <p className="text-xl text-muted-foreground font-serif">Pierwsza polska platforma prognoz rozwoju AI</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardContent className="p-0">
                  <div className="mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground font-serif text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Obszary prognoz AI</h2>
            <p className="text-xl text-muted-foreground font-serif">Przewiduj przełomy w kluczowych dziedzinach sztucznej inteligencji</p>
          </div>
          
          <div className="relative max-w-4xl mx-auto">
            <Carousel className="w-full">
              <CarouselContent>
                {applications.map((app, index) => (
                  <CarouselItem key={index}>
                    <Card className="relative overflow-hidden h-96">
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(https://images.unsplash.com/${app.image}?w=800&h=600&fit=crop)`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                      </div>
                      <CardContent className="relative z-10 p-8 h-full flex flex-col justify-end text-white">
                        <Badge className="self-start mb-4 bg-primary text-primary-foreground">
                          {app.category}
                        </Badge>
                        <h3 className="text-xl font-semibold mb-4 font-serif">{app.example}</h3>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold text-accent">
                            {app.probability}%
                          </div>
                          <div className="text-sm opacity-80">
                            {app.timeLeft} pozostało
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Dołącz do społeczności</h2>
            <p className="text-xl text-muted-foreground font-serif mb-8">
              Ponad 2,000 prognoz stworzonych, 500+ użytkowników w pierwszym miesiącu
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div className="ml-3">
                      <h4 className="font-semibold">{testimonial.name}</h4>
                    </div>
                  </div>
                  <p className="text-muted-foreground font-serif italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Poznaj zespół</h2>
            <p className="text-xl text-muted-foreground font-serif">Eksperci z pasją do prognozowania</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {teamMembers.map((member, index) => (
              <Card key={index} className="text-center p-6">
                <CardContent className="p-0">
                  <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                    {member.avatar}
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                  <p className="text-muted-foreground mb-4 font-serif">{member.role}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-primary via-navy to-charcoal text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Twoje przewidywania mają znaczenie
          </h2>
            <p className="text-xl mb-8 font-serif opacity-90 max-w-2xl mx-auto">
              Dołącz do polskiej platformy prognoz AI Futurykon i pomóż przewidywać przyszłość sztucznej inteligencji.
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4 rounded-xl" onClick={() => setSignupOpen(true)}>
              Załóż konto
            </Button>
            <AuthDialog open={signupOpen} onOpenChange={setSignupOpen} title="Zarejestruj się w Futurykon" />

            <Button size="lg" variant="outline" className="text-lg px-8 py-4 rounded-xl border-white text-white hover:bg-white hover:text-charcoal">
              Przeglądaj rynki
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-charcoal text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-primary">Futurykon</h3>
              <p className="text-gray-400 font-serif">
                Polska platforma predykcji.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">O nas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Prawne</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Regulamin</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Polityka prywatności</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Social</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Futurykon. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;