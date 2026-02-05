const technologies = [
  {
    category: 'Web Development',
    items: ['React', 'Next.js', 'Vue.js', 'Node.js', 'TypeScript', 'Tailwind CSS'],
  },
  {
    category: 'Mobile Development',
    items: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Android SDK', 'iOS SDK'],
  },
  {
    category: 'AI & Machine Learning',
    items: ['Python', 'TensorFlow', 'PyTorch', 'OpenAI', 'LangChain', 'Hugging Face'],
  },
  {
    category: 'Cloud & DevOps',
    items: ['AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'CI/CD'],
  },
  {
    category: 'Database',
    items: ['PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Supabase', 'MySQL'],
  },
  {
    category: 'Security',
    items: ['Burp Suite', 'Nmap', 'Metasploit', 'OWASP', 'SSL/TLS', 'Auth0'],
  },
];

const TechStackSection = () => {
  return (
    <section id="technology" className="section-padding relative">
      <div className="absolute inset-0 gradient-radial opacity-30" />
      
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Technology Stack
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">
            Built with Modern Technologies
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We utilize the latest tools and frameworks to build robust, 
            scalable, and high-performance solutions.
          </p>
        </div>

        {/* Tech Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <div
              key={tech.category}
              className="glass-card-hover p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <h3 className="text-lg font-semibold font-display text-primary mb-4">
                {tech.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tech.items.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
