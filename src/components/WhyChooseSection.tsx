import { Clock, Users, Shield, Cpu } from 'lucide-react';

const reasons = [
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Round-the-clock technical support to ensure your systems run smoothly at all times.',
  },
  {
    icon: Users,
    title: 'Expert Developers',
    description: 'Skilled professionals with years of experience in modern technologies and best practices.',
  },
  {
    icon: Shield,
    title: 'Secure & Scalable',
    description: 'Enterprise-grade security and infrastructure built to grow with your business.',
  },
  {
    icon: Cpu,
    title: 'Latest Technology',
    description: 'We use cutting-edge tools and frameworks to deliver future-proof solutions.',
  },
];

const WhyChooseSection = () => {
  return (
    <section className="section-padding bg-secondary/30">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">
            Your Success is Our Mission
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We go beyond just delivering projects — we build long-term partnerships 
            focused on your growth and success.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((reason, index) => (
            <div
              key={reason.title}
              className="glass-card-hover p-6 text-center group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="icon-container mx-auto mb-4">
                <reason.icon size={28} />
              </div>
              <h3 className="text-lg font-semibold font-display mb-2 group-hover:text-primary transition-colors">
                {reason.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseSection;
