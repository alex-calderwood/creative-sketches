const Easy = {
    'linear': 'linear',
  }
  
  const poems = {
    fullwake: {
      file: "finnegans_wake_raw_cleaned.txt",
      period: 20 * 60 * 60,
      orientation: 'LEFT',
      size: 15,
      showHand: true,
      showWitness: false,
      ghost: 0,
      ease: Easy.linear,
    },
    resistance: {
      file: "poems/resistance.txt",
      period: 20 * 60 * 60,
      orientation: 'LEFT',
      size: 15,
      showHand: true,
      showWitness: false,
      ghost: 0,
      ease: Easy.linear,
    },
    resistance_demo: {
      file: "demo.txt",
      period: 20 * 60 * 60,
      orientation: 'LEFT',
      size: 15,
      showHand: true,
      showWitness: false,
      ghost: 0,
      ease: Easy.linear,
    },
    wakeHour:
    { // 1
      text: "riverrun, past Eve and Adam’s, from swerve of shore to bend of bay, brings us by a commodius vicus of recirculation back to Howth Castle and Environs. ... My leaves have drifted from me. All. But one clings still. I’ll bear it on me. To remind me of. Lff! So soft this morning, ours. Yes. Carry me along, taddy, like you done through the toy fair! If I seen him bearing down on me now under whitespread wings like he’d come from Arkangels, I sink I’d die down over his feet, humbly dumbly, only to washup. Yes, tid. There’s where. First. We pass through grass behush the bush to. Whish! A gull. Gulls. Far calls. Coming, far! End here. Us then. Finn, again! Take. Bussoftlhee, mememormee! Till thousendsthee. Lps. The keys to. Given! A way a lone a lost a last a loved a long the",
      period: 3600,
      orientation: 'LEFT',
      size: 15,
      showHand: true,
      showWitness: true,
      ghost: 0
    },
    catch: { // 5
      text: "catch it and you've caught it before they can",
      period: 40,
      ease: Easy.flash,
      // ease: Easy.none,
      showHand: true,
      showWitness: false,
    },
    now: { // 5
      text: "Quick now, here, now, always- A condition of complete simplicity (Costing not less than everything)",
      period: 10,
      ease: Easy.easeInExpo,
      showHand: true,
      showWitness: false,
    },
  }