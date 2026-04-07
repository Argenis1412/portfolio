import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { ThemeProvider } from './context/ThemeContext';

import ServerWakeupNotice from './components/ServerWakeupNotice';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col pt-16 selection:bg-app-primary/30 selection:text-app-text transition-colors duration-300">
        <Navbar />
        <main className="flex-grow">
          <Hero />
          <Skills />
          <Projects />
          <Experience />
          <Contact />
          <ServerWakeupNotice />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
