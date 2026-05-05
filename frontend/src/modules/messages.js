import { api } from '../services/api.js';

const threads = [
  {
    id: 'MSG-104',
    from: 'mira.vale@relay.local',
    subject: 'Is the subject okay?',
    status: 'UNANSWERED',
    risk: 'LOW',
    messages: [
      'I have not heard from him since the last check-in. Is he safe?',
      'He said he needed quiet before the north route opened. That sounds strange, but I am trying not to panic.',
      'If anyone sees him, tell him I only need one word back.',
    ],
  },
  {
    id: 'MSG-219',
    from: 'caretaker-7@archive.invalid',
    subject: 'Tomorrow plans / movement window',
    status: 'FLAGGED',
    risk: 'MEDIUM',
    messages: [
      'The plan he described changed twice. First it was the station, then the service corridor.',
      'He asked whether the cameras near the east doors still blink every third cycle.',
      'This thread is generated for the local message sandbox only.',
    ],
  },
  {
    id: 'MSG-331',
    from: 'unknown.sender@blackbox.invalid',
    subject: 'Where did he put the notebook?',
    status: 'SENSITIVE',
    risk: 'HIGH',
    messages: [
      'He carried the notebook out of the room after the prototype tone started repeating.',
      'If the notebook is real, do not open it near the signal wall.',
      'Redaction recommended before operator review.',
    ],
  },
  {
    id: 'MSG-404',
    from: 'friend.loop@relay.local',
    subject: 'Checking in after last night',
    status: 'RECOVERED',
    risk: 'LOW',
    messages: [
      'He sounded calm, but he kept asking if the mainframe was awake.',
      'I told him to rest and stop watching the detection radar.',
      'Please confirm he is not alone.',
    ],
  },
  {
    id: 'MSG-512',
    from: 'nightdesk@relay.local',
    subject: 'He missed the second call',
    status: 'UNREAD',
    risk: 'MEDIUM',
    messages: [
      'The second call window passed with no response.',
      'He usually sends a blank message if he is okay but unable to talk.',
      'Do we wait for the next window or send someone to the lobby?',
    ],
  },
  {
    id: 'MSG-677',
    from: 'r.kade@ops.local',
    subject: 'Route change after the rain started',
    status: 'ROUTED',
    risk: 'MEDIUM',
    messages: [
      'He changed the route after the rain started and said the old path felt watched.',
      'The south stairwell remains quiet, but the service door alarm has a delay.',
      'If plans change again, we should treat the check-in as unstable.',
    ],
  },
  {
    id: 'MSG-702',
    from: 'lena.cross@relay.local',
    subject: 'Did he sleep?',
    status: 'OPEN',
    risk: 'LOW',
    messages: [
      'He said he was going to sleep after the archive lights stopped flickering.',
      'I am asking because he sounded wired and kept repeating the same phrase.',
      'Please just confirm that he got home.',
    ],
  },
  {
    id: 'MSG-818',
    from: 'sealed.drop@blackbox.invalid',
    subject: 'The envelope under the terminal',
    status: 'SENSITIVE',
    risk: 'HIGH',
    messages: [
      'The envelope is still under the terminal, behind the red cable bundle.',
      'He said not to move it unless the signal trace turns white.',
      'This message should be redacted before any broad review.',
    ],
  },
  {
    id: 'MSG-930',
    from: 'doctor.hale@relay.local',
    subject: 'Status request: stress indicators',
    status: 'PRIORITY',
    risk: 'LOW',
    messages: [
      'He reported headaches, poor sleep, and fixation on the radar display.',
      'Ask whether he ate today and whether he can name the current hour.',
      'If he cannot answer normally, route him to a person, not the system.',
    ],
  },
  {
    id: 'MSG-011',
    from: 'elevator.receipts@subfloor.invalid',
    subject: 'The elevator apologized again',
    status: 'ODDITY',
    risk: 'LOW',
    messages: [
      'The west elevator printed an apology receipt with no floor number and three wet fingerprints.',
      'It says he owes the building one quiet minute before noon, which is not a normal maintenance code.',
      'Please stop feeding coins into the speaker grille even if it hums back.',
    ],
  },
  {
    id: 'MSG-086',
    from: 'candle-array@nightdesk.local',
    subject: 'Do not trust the beige calendar',
    status: 'GLITCHED',
    risk: 'MEDIUM',
    messages: [
      'The calendar on his desk has added a thirteenth Tuesday called SOFT ARRIVAL.',
      'He circled it with a red pen, then insisted he has never owned a red pen.',
      'If the page rustles without airflow, close the blinds and count backward from 41.',
    ],
  },
  {
    id: 'MSG-143',
    from: 'parcel.limbo@relay.local',
    subject: 'Package delivered to yesterday',
    status: 'QUEUED',
    risk: 'LOW',
    messages: [
      'A package arrived marked DELIVERED TO YESTERDAY and the tape is warmer than the room.',
      'Inside was only a receipt for a sandwich he has not ordered yet.',
      'The courier asked if he still plans to remember the blue hallway.',
    ],
  },
  {
    id: 'MSG-208',
    from: 'staticcommittee@blackbox.invalid',
    subject: 'Meeting minutes from the empty chair',
    status: 'SENSITIVE',
    risk: 'HIGH',
    messages: [
      'The empty chair voted against opening the archive, then asked to be excused.',
      'He wrote down the motion even though nobody spoke for seven minutes.',
      'Minutes attached themselves to the underside of the desk. Recommend gloves.',
    ],
  },
  {
    id: 'MSG-276',
    from: 'laundry.oracle@relay.local',
    subject: 'His socks know the route',
    status: 'OPEN',
    risk: 'LOW',
    messages: [
      'He left two socks by the terminal and both are pointing toward different exits.',
      'One smells like rain, the other smells like printer toner and cinnamon.',
      'If he asks which one to follow, tell him the floor has already chosen.',
    ],
  },
  {
    id: 'MSG-349',
    from: 'window.nine@ops.local',
    subject: 'Window 9 is requesting permission',
    status: 'FLAGGED',
    risk: 'MEDIUM',
    messages: [
      'Window 9 is asking permission to blink, but this room only has six windows.',
      'He said the extra window appears when the coffee gets cold.',
      'Do not approve the request unless the reflection is facing the correct way.',
    ],
  },
  {
    id: 'MSG-481',
    from: 'teeth-of-the-clock@archive.invalid',
    subject: 'Clock chewing at 03:17',
    status: 'RECOVERED',
    risk: 'MEDIUM',
    messages: [
      'The hallway clock made chewing sounds at 03:17 and lost exactly one minute.',
      'He apologized to it, which seemed to help, but now it runs only when watched.',
      'Please confirm whether timekeeping equipment is supposed to have teeth.',
    ],
  },
  {
    id: 'MSG-563',
    from: 'mirror.support@relay.local',
    subject: 'The mirror returned a different password',
    status: 'LOCKED',
    risk: 'HIGH',
    messages: [
      'He whispered the password to the mirror and it whispered back a better one.',
      'The new password unlocked nothing except the cabinet with all the dead batteries.',
      'He keeps saying the mirror is not wrong, just early.',
    ],
  },
  {
    id: 'MSG-640',
    from: 'stairwell.radio@subfloor.invalid',
    subject: 'Stairwell broadcast: soup protocol',
    status: 'UNREAD',
    risk: 'LOW',
    messages: [
      'The stairwell radio is broadcasting a recipe for soup in emergency phonetics.',
      'He wrote down ALPHA CARROT DELTA SPOON and looked very serious about it.',
      'Nobody should boil anything until the signal trace stops tasting metallic.',
    ],
  },
  {
    id: 'MSG-719',
    from: 'ceiling.tile.44@blackbox.invalid',
    subject: 'Tile 44 wants its name back',
    status: 'ODDITY',
    risk: 'MEDIUM',
    messages: [
      'Ceiling tile 44 filed a complaint about being called 45 in the maintenance log.',
      'He stood beneath it and nodded like it had made a fair point.',
      'The tile stopped dripping numbers after he corrected the label.',
    ],
  },
  {
    id: 'MSG-802',
    from: 'breakroom.choir@relay.local',
    subject: 'Microwave harmonics are off-key',
    status: 'ROUTED',
    risk: 'LOW',
    messages: [
      'The microwave harmonics are off-key and the vending machine refuses to harmonize.',
      'He says this means the building is nervous about lunch.',
      'Please ask him whether the soup protocol email is related. We are afraid it is.',
    ],
  },
  {
    id: 'MSG-911',
    from: 'soft-door@nightdesk.local',
    subject: 'Door became theoretical for six seconds',
    status: 'PRIORITY',
    risk: 'HIGH',
    messages: [
      'The service door became theoretical for six seconds and everyone agreed not to use it.',
      'He put his hand through the handle, then apologized to the idea of hardware.',
      'If he mentions hinges, redirect him to something with fewer implications.',
    ],
  },
];

function renderThreadList(activeId = threads[0].id) {
  return threads
    .map(
      (thread) => `
        <button type="button" class="message-thread ${thread.id === activeId ? 'is-active' : ''}" data-thread-id="${thread.id}">
          <span>${thread.id}</span>
          <strong>${thread.subject}</strong>
          <b>${thread.status}</b>
        </button>
      `,
    )
    .join('');
}

function renderThread(thread) {
  return `
    <div class="message-header">
      <p><span>FROM</span><strong>${thread.from}</strong></p>
      <p><span>SUBJECT</span><strong>${thread.subject}</strong></p>
      <p><span>RISK</span><strong>${thread.risk}</strong></p>
    </div>
    <div class="message-body">
      ${thread.messages.map((message, index) => `<p><span>${String(index + 1).padStart(2, '0')}</span>${message}</p>`).join('')}
    </div>
  `;
}

export const messagesModule = {
  id: 'messages',
  label: 'MESSAGES',
  code: '09',
  render() {
    const active = threads[0];
    return `
      <div class="module-grid messages-layout">
        <article class="panel">
          <h3>Inbox Simulator</h3>
          <p class="muted">Message sandbox. No real accounts, contacts, or external mailboxes are accessed.</p>
          <div id="message-threads" class="message-threads">${renderThreadList(active.id)}</div>
        </article>
        <article class="panel span-2 message-reader-panel">
          <h3>Thread Viewer</h3>
          <div class="action-bar">
            <button type="button" data-message-action="scan">Scan thread</button>
            <button type="button" data-message-action="redact">Redact sensitive</button>
            <button type="button" data-message-action="draft">Draft reply</button>
            <button type="button" data-message-action="archive">Archive</button>
          </div>
          <p class="action-status" id="messages-status">Message buffer loaded.</p>
          <div id="message-reader" class="message-reader">${renderThread(active)}</div>
        </article>
        <article class="panel">
          <h3>Subject Snapshot</h3>
          <div class="detection-readout">
            <p><span>WELLNESS</span><strong id="subject-wellness">UNKNOWN</strong></p>
            <p><span>NEXT PLAN</span><strong id="subject-plan">UNCONFIRMED</strong></p>
            <p><span>CONTACT RISK</span><strong id="subject-risk">${active.risk}</strong></p>
            <p><span>REPLY STATE</span><strong id="reply-state">NONE</strong></p>
          </div>
          <textarea id="reply-draft" class="reply-draft" placeholder="Generated reply appears here"></textarea>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const list = root.querySelector('#message-threads');
    const reader = root.querySelector('#message-reader');
    const status = root.querySelector('#messages-status');
    const wellness = root.querySelector('#subject-wellness');
    const plan = root.querySelector('#subject-plan');
    const risk = root.querySelector('#subject-risk');
    const replyState = root.querySelector('#reply-state');
    const draft = root.querySelector('#reply-draft');
    let activeId = threads[0].id;

    function activeThread() {
      return threads.find((thread) => thread.id === activeId) || threads[0];
    }

    function renderActive() {
      const thread = activeThread();
      list.innerHTML = renderThreadList(thread.id);
      reader.innerHTML = renderThread(thread);
      risk.textContent = thread.risk;
      wellness.textContent = thread.risk === 'HIGH' ? 'NEEDS CHECK' : thread.risk === 'MEDIUM' ? 'UNCLEAR' : 'LIKELY OK';
      plan.textContent = thread.subject.toLowerCase().includes('plan') ? 'MOVEMENT WINDOW' : 'AWAITING REPLY';
    }

    root.addEventListener('click', async (event) => {
      const threadButton = event.target.closest('[data-thread-id]');
      if (threadButton) {
        activeId = threadButton.dataset.threadId;
        renderActive();
        status.textContent = `${activeId} opened for review.`;
        return;
      }

      const actionButton = event.target.closest('[data-message-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.messageAction;
      const thread = activeThread();
      if (action === 'scan') {
        status.textContent = `${thread.id} scanned. Emotional tone: ${thread.risk === 'HIGH' ? 'strained' : 'concerned'}.`;
      }
      if (action === 'redact') {
        reader.querySelectorAll('.message-body p').forEach((row, index) => {
          if (index % 2 === 1 || thread.risk === 'HIGH') row.classList.add('is-redacted');
        });
        status.textContent = 'Sensitive details redacted.';
      }
      if (action === 'draft') {
        draft.value = `Subject is under observation. Current status: ${wellness.textContent}. Plans remain ${plan.textContent.toLowerCase()}. Do not escalate unless the next check-in is missed.`;
        replyState.textContent = 'DRAFTED';
        status.textContent = 'Reply drafted locally.';
      }
      if (action === 'archive') {
        thread.status = 'ARCHIVED';
        renderActive();
        status.textContent = `${thread.id} moved into simulated cold archive.`;
      }
      const result = await api.action('messages', action, thread.id).catch(() => ({ message: `Messages ${action} completed locally.` }));
      log.push(result.message.toUpperCase());
    }, { signal: controller.signal });

    const drift = window.setInterval(() => {
      const values = ['LIKELY OK', 'UNCLEAR', 'NEEDS CHECK', 'QUIET', 'RESPONDED'];
      wellness.textContent = values[Math.floor(Math.random() * values.length)];
    }, state.performance ? 3400 : 1800);

    return () => {
      controller.abort();
      window.clearInterval(drift);
    };
  },
};
