import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll } from 'motion/react';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CaretDownIcon,
  ListIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
  WalletIcon,
  XIcon,
  XLogoIcon,
} from '@phosphor-icons/react';
import Atmosphere from '../components/Atmosphere';
import MissionJourney from '../components/MissionJourney';
import {
  EditorialHeading,
  EditorialMotionContext,
  TiltSurface,
} from '../components/EditorialMotion';
import {
  AtlasManifesto,
  AtlasReveal,
  ContributionPaths,
  OrderOrbit,
} from '../components/AtlasVisuals';
import { Brand } from '../components/Primitives';
import { useMotionPreference } from '../lib/useMotionPreference';

const questions = [
  [
    'What is The Order of Steering?',
    'A community for people who create, connect and make things better. Find a mission, share your work and build a contribution record of your own.',
  ],
  [
    'Do I need to connect a wallet?',
    'You can explore the mission board freely. To contribute, sign in with your EVM wallet and connect your X account. Both identities become part of your member profile.',
  ],
  [
    'How are contributions verified?',
    'Submit a link and a description of your work. X missions check authorship and mission criteria, then Keepers review quality. Other contributions go directly to Keepers. Follow each decision in your profile.',
  ],
  [
    'How do I earn points?',
    'Complete a mission and share the evidence. Once Keepers approve your work, the mission points are added to your profile. Your history keeps a record of every contribution and decision.',
  ],
];

export default function Landing() {
  const [active, setActive] = useState(true),
    [menu, setMenu] = useState(false);
  const reduced = useMotionPreference();
  const { scrollYProgress } = useScroll();
  return (
    <EditorialMotionContext.Provider value={active}>
      <div className="landing order-atlas" data-motion={active ? 'active' : 'paused'}>
        <Link className="skip-link" to="/#main-content">
          Skip to content
        </Link>
        <header
          className="atlas-header"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menu) {
              setMenu(false);
              document.querySelector<HTMLButtonElement>('.atlas-menu')?.focus();
            }
          }}
        >
          <Link to="/" aria-label="The Order of Steering, home">
            <Brand />
          </Link>
          <nav
            id="atlas-navigation"
            className={menu ? 'atlas-nav open' : 'atlas-nav'}
            aria-label="Main navigation"
          >
            <Link to="/#the-order" onClick={() => setMenu(false)}>
              The Order
            </Link>
            <Link to="/#contribute" onClick={() => setMenu(false)}>
              How to contribute
            </Link>
            <Link to="/#questions" onClick={() => setMenu(false)}>
              Questions
            </Link>
          </nav>
          <div className="atlas-header-actions">
            <Link className="atlas-button atlas-button-small" to="/app">
              Enter the app <ArrowUpRightIcon size={17} />
            </Link>
            <button
              className="atlas-motion-toggle"
              onClick={() => setActive(!active)}
              aria-label={active ? 'Pause background animation' : 'Play background animation'}
              title={active ? 'Pause atmosphere' : 'Play atmosphere'}
              aria-pressed={!active}
            >
              {active ? (
                <PauseIcon size={15} weight="fill" />
              ) : (
                <PlayIcon size={15} weight="fill" />
              )}
            </button>
            <button
              className="atlas-menu"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              aria-expanded={menu}
              aria-controls="atlas-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <XIcon size={24} /> : <ListIcon size={24} />}
            </button>
          </div>
          <motion.div
            className="atlas-reading-progress"
            style={{ scaleX: scrollYProgress }}
            aria-hidden="true"
          />
        </header>

        <main id="main-content" tabIndex={-1}>
          <section className="atlas-hero" id="arrival">
            <Atmosphere active={active} />
            <div className="atlas-hero-frame" aria-hidden="true" />
            <div className="atlas-shell atlas-hero-layout">
              <motion.div
                className="hero-copy atlas-hero-copy"
                initial={reduced ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9 }}
              >
                <span className="atlas-kicker">
                  <span className="atlas-live-dot" /> AN OPEN INVITATION TO CONTRIBUTE
                </span>
                <EditorialHeading
                  level={1}
                  lines={[{ text: 'Make your' }, { text: 'mark.', italic: true }]}
                />
                <p>
                  A world shaped by people who show up.
                  <br />
                  Bring your ideas. Find your mission.
                  <br className="atlas-mobile-break" /> Leave something worth recognizing.
                </p>
                <div className="atlas-hero-actions">
                  <Link to="/app" className="atlas-button">
                    Enter the app <ArrowUpRightIcon size={20} />
                  </Link>
                  <Link to="/#possibilities" className="atlas-text-link">
                    Find your place <ArrowRightIcon size={18} />
                  </Link>
                </div>
              </motion.div>
              <div className="atlas-hero-annotation" aria-hidden="true">
                <OrderOrbit />
                <span>
                  MANY PERSPECTIVES.
                  <br />
                  ONE SHARED DIRECTION.
                </span>
              </div>
            </div>
            <div className="atlas-hero-bottom atlas-shell">
              <Link className="atlas-scroll-cue" to="/#the-order">
                <span className="atlas-scroll-line" />
                <span>SCROLL INTO THE ORDER</span>
              </Link>
              <span className="atlas-hero-caption">THE ASSEMBLY / THE ORDER OF STEERING</span>
              <span className="atlas-edition">
                VOL. 001 <span>/</span> THE BEGINNING
              </span>
            </div>
          </section>

          <AtlasManifesto />

          <section className="atlas-order" id="the-order" aria-labelledby="order-title">
            <div className="atlas-fabric" aria-hidden="true" />
            <div className="atlas-shell atlas-order-grid">
              <AtlasReveal className="atlas-portrait-composition">
                <span className="atlas-kicker">A PERSPECTIVE OF YOUR OWN</span>
                <TiltSurface className="atlas-portrait">
                  <img
                    src="/assets/branding/pfp-approved-v01.png"
                    alt="A fictional Order member in a purple privacy robe, with eyes visible beneath the hood"
                    width="1254"
                    height="1254"
                    loading="lazy"
                  />
                </TiltSurface>
                <div className="atlas-portrait-caption">
                  <span>
                    Private identity.
                    <br />
                    <em>Shared purpose.</em>
                  </span>
                  <span>
                    THE ORDER
                    <br />
                    PORTRAIT / 001
                  </span>
                </div>
                <OrderOrbit className="atlas-portrait-orbit" />
              </AtlasReveal>
              <AtlasReveal className="atlas-order-copy" delay={0.1}>
                <span className="atlas-kicker">02 / THE IDEA BEHIND THE ORDER</span>
                <EditorialHeading
                  id="order-title"
                  lines={[{ text: 'Many voices.' }, { text: 'One direction.', italic: true }]}
                />
                <p>
                  In <em>Snowmoon</em>, the Order brings together different perspectives and a
                  common responsibility. Here, that idea becomes an invitation to create, connect
                  and make things better.
                </p>
                <p>
                  You bring the perspective.
                  <br />
                  The mission gives it a place to matter.
                </p>
                <div className="atlas-roles">
                  <div>
                    <span>01 / KEEPERS</span>
                    <h3>Set the direction.</h3>
                    <p>Our team creates missions and makes the requirements clear.</p>
                  </div>
                  <div>
                    <span>02 / SENTINELS</span>
                    <h3>Follow the evidence.</h3>
                    <p>Verification gives recognition a reason. Keepers review the quality.</p>
                  </div>
                </div>
                <a
                  className="atlas-text-link"
                  href="https://vitalik.eth.limo/snowmoon/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explore the story that inspired us <ArrowUpRightIcon size={18} />
                  <span className="sr-only"> (new tab)</span>
                </a>
              </AtlasReveal>
            </div>
            <span className="atlas-order-word" aria-hidden="true">
              The Order.
            </span>
          </section>

          <section
            className="atlas-possibilities"
            id="possibilities"
            aria-labelledby="possibilities-title"
          >
            <div className="atlas-shell">
              <AtlasReveal className="atlas-section-heading">
                <div>
                  <span className="atlas-kicker">03 / FIND YOUR WAY IN</span>
                  <EditorialHeading
                    id="possibilities-title"
                    lines={[{ text: 'Your talent.' }, { text: 'Our next chapter.', italic: true }]}
                  />
                </div>
                <p>
                  There is more than one way to move
                  <br />a community forward. Find yours.
                </p>
              </AtlasReveal>
              <AtlasReveal>
                <ContributionPaths />
              </AtlasReveal>
              <div className="atlas-section-foot">
                <span>THREE WAYS TO BEGIN. ROOM FOR YOUR OWN IDEAS.</span>
                <Link className="atlas-text-link" to="/app">
                  View all missions <ArrowUpRightIcon size={19} />
                </Link>
              </div>
            </div>
          </section>

          <section className="atlas-record" id="contribute" aria-labelledby="record-title">
            <div className="atlas-record-grid" aria-hidden="true" />
            <div className="atlas-shell">
              <AtlasReveal className="atlas-section-heading">
                <div>
                  <span className="atlas-kicker">04 / FROM INTENTION TO EVIDENCE</span>
                  <EditorialHeading
                    id="record-title"
                    lines={[{ text: 'Your work.' }, { text: 'A lasting record.', italic: true }]}
                  />
                </div>
                <p>
                  A clear brief. Evidence you can share.
                  <br />A decision you can follow.
                </p>
              </AtlasReveal>
              <AtlasReveal>
                <MissionJourney active={active} />
              </AtlasReveal>
              <AtlasReveal className="atlas-identity-strip">
                <span>
                  <ShieldCheckIcon size={23} /> A contribution record of your own.
                </span>
                <div>
                  <span>
                    <WalletIcon size={17} /> Wallet
                  </span>
                  <i>+</i>
                  <span>
                    <XLogoIcon size={17} /> X account
                  </span>
                </div>
                <Link to="/app/profile" className="atlas-text-link">
                  Create your profile <ArrowUpRightIcon size={18} />
                </Link>
              </AtlasReveal>
              <p className="atlas-record-note">
                Both connections are required to submit a mission. Points are recorded after
                approval.
              </p>
            </div>
          </section>

          <section className="atlas-faq" id="questions" aria-labelledby="questions-title">
            <div className="atlas-shell atlas-faq-grid">
              <AtlasReveal>
                <span className="atlas-kicker">05 / BEFORE YOUR FIRST STEP</span>
                <EditorialHeading
                  id="questions-title"
                  lines={[{ text: 'A little' }, { text: 'clarity.', italic: true }]}
                />
                <p>
                  Good questions.
                  <br />
                  Straightforward answers.
                </p>
                <OrderOrbit />
              </AtlasReveal>
              <div className="atlas-faq-list">
                {questions.map(([question, answer], i) => (
                  <AtlasReveal key={question} delay={i * 0.04}>
                    <details>
                      <summary>
                        <span className="atlas-question-index">0{i + 1}</span>
                        <span>{question}</span>
                        <CaretDownIcon size={19} />
                      </summary>
                      <p>{answer}</p>
                    </details>
                  </AtlasReveal>
                ))}
              </div>
            </div>
          </section>

          <section className="atlas-invitation" id="invitation">
            <div className="atlas-invitation-photo" aria-hidden="true" />
            <div className="atlas-invitation-shade" />
            <div className="atlas-shell">
              <AtlasReveal>
                <span className="atlas-kicker">06 / WELCOME, ACOLYTE</span>
                <EditorialHeading
                  lines={[{ text: 'The next chapter' }, { text: 'starts with you.', italic: true }]}
                />
                <p>A new idea. A useful contribution. A place in the Order.</p>
                <Link className="atlas-button" to="/app">
                  Find your first mission <ArrowUpRightIcon size={22} />
                </Link>
              </AtlasReveal>
              <span className="atlas-invitation-note">
                A SHARED DIRECTION IS MADE
                <br />
                ONE CONTRIBUTION AT A TIME.
              </span>
            </div>
          </section>
        </main>

        <footer className="atlas-footer">
          <div className="atlas-shell">
            <div className="atlas-footer-top">
              <Link to="/" aria-label="The Order of Steering, home">
                <Brand />
              </Link>
              <a
                className="atlas-text-link"
                href="https://vitalik.eth.limo/snowmoon/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Inspired by Snowmoon <ArrowUpRightIcon size={17} />
                <span className="sr-only"> (new tab)</span>
              </a>
              <Link className="atlas-text-link" to="/app">
                Enter the app <ArrowUpRightIcon size={17} />
              </Link>
            </div>
            <p className="atlas-footer-word" aria-hidden="true">
              The Order of Steering
            </p>
            <div className="atlas-footer-bottom">
              <span>INDEPENDENT MINDS. SHARED PURPOSE.</span>
              <span>THE BEGINNING / VOL. 001</span>
            </div>
          </div>
        </footer>
      </div>
    </EditorialMotionContext.Provider>
  );
}
