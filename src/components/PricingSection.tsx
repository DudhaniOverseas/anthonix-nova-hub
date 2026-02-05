import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹9,999',
    period: '/project',
    description: 'Perfect for small businesses and startups',
    features: [
      'Single page website',
      'Responsive design',
      'Basic SEO setup',
      '3 rounds of revisions',
      '1 month support',
      'Source code delivery',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹29,999',
    period: '/project',
    description: 'Best for growing businesses',
    features: [
      'Multi-page website (up to 10)',
      'Custom UI/UX design',
      'Advanced SEO optimization',
      'CMS integration',
      '5 rounds of revisions',
      '3 months support',
      'Analytics setup',
      'Performance optimization',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large-scale projects',
    features: [
      'Unlimited pages & features',
      'Custom software development',
      'AI/ML integration',
      'Enterprise security',
      'Dedicated project manager',
      '12 months support',
      'Priority support 24/7',
      'SLA guarantee',
    ],
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="section-padding relative">
      <div className="absolute inset-0 gradient-radial opacity-30" />
      
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Pricing Plans
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">
            Transparent & Flexible Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose a plan that fits your needs. Custom quotes available for 
            specialized projects and enterprise requirements.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card p-8 relative ${
                plan.popular
                  ? 'border-primary/50 scale-105 glow-primary'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    <Sparkles size={14} />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold font-display mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="text-primary flex-shrink-0" size={18} />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'glow' : 'outline-glow'}
                className="w-full"
                size="lg"
              >
                {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
