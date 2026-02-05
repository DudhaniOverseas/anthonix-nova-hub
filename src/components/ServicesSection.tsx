import { 
  Globe, 
  Smartphone, 
  Bot, 
  Shield, 
  Video, 
  Music, 
  Code2 
} from 'lucide-react';

const services = [
  {
    icon: Globe,
    title: 'Website Design & Development',
    description: 'Custom business websites, portfolios, and e-commerce platforms built with modern technologies for optimal performance and SEO.',
  },
  {
    icon: Smartphone,
    title: 'Mobile App Development',
    description: 'Native and cross-platform Android & iOS applications with intuitive UI/UX and seamless performance.',
  },
  {
    icon: Bot,
    title: 'AI Bot Development',
    description: 'Intelligent chatbots, automation bots, and business AI solutions to streamline your operations and customer service.',
  },
  {
    icon: Shield,
    title: 'Cybersecurity & Ethical Hacking',
    description: 'Professional penetration testing, vulnerability assessments, and security audits to protect your digital assets.',
  },
  {
    icon: Video,
    title: 'Video Editing & Motion Graphics',
    description: 'Professional video production, editing, and stunning motion graphics for marketing and brand storytelling.',
  },
  {
    icon: Music,
    title: 'Audio Mixing & Sound Design',
    description: 'Studio-quality audio mixing, sound design, and music production for multimedia projects.',
  },
  {
    icon: Code2,
    title: 'Custom Software Solutions',
    description: 'Bespoke software development tailored to your unique business requirements and workflow automation needs.',
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="section-padding relative">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-radial opacity-50" />
      
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Our Services
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">
            End-to-End Digital Solutions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From concept to deployment, we deliver comprehensive technology services 
            that power your business growth and digital transformation.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="glass-card-hover p-6 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="icon-container mb-4">
                <service.icon size={28} />
              </div>
              <h3 className="text-xl font-semibold font-display mb-3 group-hover:text-primary transition-colors">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
