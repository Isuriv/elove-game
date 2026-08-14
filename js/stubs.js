/* Phase 4 system stubs - APIs ready, not active in demo */
export const Phase4 = {
  infection: {
    enabled: false,
    apply(_item) {
      return null;
    },
  },
  godSabotage: {
    enabled: false,
    sendCyborg(_x, _y) {
      return false;
    },
    shutConsole() {
      return false;
    },
    fakeHint() {
      return null;
    },
  },
  dimensionalShift: {
    enabled: false,
    usedThisRun: false,
    trigger() {
      return false;
    },
  },
  summonAssist: {
    enabled: false,
    remainingMs: 0,
    activate(_ms) {
      return false;
    },
  },
  opMode: {
    unlocked: false,
    active: false,
  },
};
