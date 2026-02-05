import { CheckCircle, Zap, Shield, Users } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Zap,
      title: 'Innovation First',
      description: 'We leverage cutting-edge technologies to deliver future-proof solutions.',
    },
    {
      icon: Shield,
      title: 'Security Focused',
      description: 'Enterprise-grade security practices embedded in every project.',
    },
    {
      icon: Users,
      title: 'Client Centric',
      description: 'Your success is our priority with dedicated support and collaboration.',
    },
  ];

  return (
    <section id="about" className="section-padding bg-secondary/30">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              About Us
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-6">
              Transforming Ideas into{' '}
              <span className="text-primary">Digital Reality</span>
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              AnthoniX Media is a full-service digital technology company dedicated to 
              empowering businesses worldwide. We combine creative excellence with technical 
              expertise to deliver solutions that drive real results.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Our team of experienced developers, designers, and strategists work 
              collaboratively to understand your unique challenges and create tailored 
              solutions that exceed expectations.
            </p>

            {/* Checklist */}
            <ul className="space-y-3">
              {[
                'Certified & experienced development team',
                'Agile methodology for faster delivery',
                'Transparent communication & reporting',
                'Post-launch support & maintenance',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="text-primary flex-shrink-0" size={20} />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card-hover p-6 flex items-start gap-4"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="icon-container flex-shrink-0">
                  <feature.icon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold font-display mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Stats Card */}
            <div className="glass-card p-6 bg-primary/5 border-primary/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">5+</div>
                  <div className="text-xs text-muted-foreground">Years Experience</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">150+</div>
                  <div className="text-xs text-muted-foreground">Projects Done</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">15+</div>
                  <div className="text-xs text-muted-foreground">Countries Served</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
