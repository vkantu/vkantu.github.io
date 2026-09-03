// chat.js - simple Supabase-backed chat for employee dashboard
(function () {
  const messagesEl = document.getElementById("chat-messages");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const chatMessage = document.getElementById("chat-message");
  const sessionLabel = document.getElementById("employee-session-email");

  let userEmail = "";

  const scrollBottom = () => {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderOne = (m) => {
    const isMe = m.sender_email === userEmail;
    const time = m.created_at ? new Date(m.created_at).toLocaleTimeString() : "";
    return `
      <div class="chat-message ${isMe ? 'me' : 'them'}">
        <div class="chat-bubble">
          <div class="chat-text">${escapeHtml(m.content)}</div>
          <div class="chat-time">${time}</div>
        </div>
      </div>
    `;
  };

  const escapeHtml = (str) => {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const loadMessages = async () => {
    if (!userEmail) return;
    messagesEl.innerHTML = '<p class="dashboard-message">Loading chat...</p>';
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`sender_email.eq.${userEmail},recipient_email.eq.${userEmail}`)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      if (!data || !data.length) {
        messagesEl.innerHTML = '<p class="dashboard-message">No messages yet.</p>';
        return;
      }

      messagesEl.innerHTML = data.map(renderOne).join('');
      scrollBottom();
    } catch (err) {
      console.error(err);
      messagesEl.innerHTML = '<p class="dashboard-message">Unable to load chat.</p>';
    }
  };

  const appendMessage = (m) => {
    if (!messagesEl) return;
    messagesEl.insertAdjacentHTML('beforeend', renderOne(m));
    scrollBottom();
  };

  // Wait until session label contains an email
  const waitForEmail = async () => {
    let tries = 0;
    while (tries < 50) {
      const txt = sessionLabel ? sessionLabel.textContent || '' : '';
      const match = txt.match(/([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/);
      if (match) {
        userEmail = match[1];
        return;
      }
      await new Promise(r => setTimeout(r, 200));
      tries++;
    }
  };

  (async function init() {
    await waitForEmail();
    if (!userEmail) {
      console.warn('chat: user email not found; chat disabled');
      return;
    }

    await loadMessages();

    // Realtime subscription
    try {
      const channel = supabaseClient
        .channel('messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new;
          if (m.sender_email === userEmail || m.recipient_email === userEmail) {
            appendMessage(m);
          }
        })
        .subscribe();
    } catch (e) {
      console.error('chat: realtime subscription failed', e);
    }

    // send message
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      chatMessage.textContent = '';
      try {
        const payload = {
          sender_email: userEmail,
          recipient_email: 'company@rk.com',
          content: text,
        };
        const { error } = await supabaseClient.from('messages').insert([payload]);
        if (error) throw error;
        input.value = '';
      } catch (err) {
        console.error(err);
        chatMessage.textContent = err.message || 'Unable to send message.';
      }
    });
  })();

})();
