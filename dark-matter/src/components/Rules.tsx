export function Rules() {
  return (
    <details className="rules">
      <summary>Rules</summary>
      <ul>
        <li>You are amber. The opposition is violet. Dust-colored regions are unaligned garrisons.</li>
        <li>Each turn you gain one fleet for every region you hold. Place all of them before you move.</li>
        <li>You may give two orders. An order sends fleets from a region you hold into an adjacent region.</li>
        <li>Leave fleets behind, or send them all and abandon the source.</li>
        <li>Send more fleets than the defenders and you take the region, keeping the difference. Equal strength clears both. Fewer fleets are lost, and the defender keeps what remains.</li>
        <li>Win by holding the Core Well with at least three fleets at the start of your turn. You have to keep it through the other fleet&apos;s reply. Five regions also wins. The same rules can beat you.</li>
        <li>After eight rounds, the heavier claim wins. Core regions weigh more.</li>
        <li>Keyboard: Tab to a region, Enter to choose it, plus and minus to set fleets, Escape to clear.</li>
      </ul>
    </details>
  );
}
