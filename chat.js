// chat.js - minimal chat widget for a single employee
(function(){
  const TARGET_EMAIL = 'doppalapudisaivignesh1998@gmail.com';
  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chat-widget');
  const closeBtn = document.getElementById('chat-close');
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const unread = document.getElementById('chat-unread');
  const sessionLabel = document.getElementById('employee-session-email');

  let userEmail = '';

  function showWidget(show){
    widget.style.display = show ? 'flex' : 'none';
    widget.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function renderMessage(m){
    const isMe = m.sender_email === userEmail;
    const time = m.created_at ? new Date(m.created_at).toLocaleString() : '';
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (isMe ? 'me' : '');
    div.innerHTML = `<div class="chat-bubble">${escapeHtml(m.content)}<span class="chat-time">${time}</span></div>`;
    messagesEl.appendChild(div);
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function loadConversation(){
    messagesEl.innerHTML = '<p class="dashboard-message">Loading...</p>';
    try{
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`sender_email.eq.${userEmail},recipient_email.eq.${userEmail}`)
        .order('created_at', {ascending:true})
        .limit(500);
      if(error) throw error;
      messagesEl.innerHTML = '';
      if(!data || !data.length){ messagesEl.innerHTML = '<p class="dashboard-message">No messages.</p>'; return; }
      data.forEach(renderMessage);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }catch(e){ console.error(e); messagesEl.innerHTML = '<p class="dashboard-message">Unable to load messages.</p>'; }
  }

  const waitForEmail = async ()=>{
    for(let i=0;i<50;i++){
      const txt = sessionLabel ? sessionLabel.textContent || '' : '';
      const m = txt.match(/([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/);
      if(m){ userEmail = m[1]; return true; }
      await new Promise(r=>setTimeout(r,150));
    }
    return false;
  };

  (async function init(){
    const hasEmail = await waitForEmail();
    if(!hasEmail || userEmail !== TARGET_EMAIL){
      // hide toggle if not the target user
      if(toggle) toggle.style.display = 'none';
      return;
    }

    // show toggle
    toggle.style.display = 'flex';

    toggle.addEventListener('click', async ()=>{
      const isOpen = widget.style.display === 'flex';
      if(isOpen){ showWidget(false); } else { showWidget(true); await loadConversation(); unread.style.display='none'; }
    });

    closeBtn.addEventListener('click', ()=> showWidget(false));

    // Realtime
    try{
      supabaseClient
        .channel('chat_widget')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const m = payload.new;
          if(m.sender_email === userEmail || m.recipient_email === userEmail){
            // if widget open, append, else show unread
            if(widget.style.display === 'flex'){ renderMessage(m); messagesEl.scrollTop = messagesEl.scrollHeight; }
            else unread.style.display = 'inline';
          }
        })
        .subscribe();
    }catch(e){ console.warn('realtime not available', e); }

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const text = input.value.trim(); if(!text) return;
      const payload = { sender_email: userEmail, recipient_email: 'company@rk.com', content: text };
      const { error } = await supabaseClient.from('messages').insert([payload]);
      if(error){ console.error(error); alert('Send failed'); return; }
      input.value = '';
    });
  })();
})();
