<script>
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import showdown from "showdown";
  
  let messages = $state([]);
  let inputMessage = $state("");
  let inputEl;
  let isLoading = $state(false);

  const converter = new showdown.Converter({
    tables: true,
    tasklists: true,
    code: true,
    openLinksInNewWindow: true,
    // ensures code blocks are properly wrapped
    extensions: [{
      type: 'output',
      regex: /<pre><code>/g,
      replace: '<pre><code class="code-block">'
    }]
  });

  onMount(() => inputEl.focus());
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    inputMessage = "";
    if (inputEl) inputEl.style.height = '2rem';

    messages = [...messages, { content: userMessage, role: "user" }];

    let streamedResponse = "";
    try {
      isLoading = true;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      messages = [...messages, { content: '', role: 'bot' }]; // bot message placeholder
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // decode the chunk and parse the SSE data
        const chunk = decoder.decode(value);
        const lines = chunk.split('data: ');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line.trim());
              if (parsed.response) {
                streamedResponse += parsed.response;
                // update the last message (bot's response)
                messages[messages.length - 1].content = converter.makeHtml(streamedResponse);
              }
            } catch (e) {
              console.warn('Failed to parse chunk:', line);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      messages = [...messages, { content: 'Sorry, there was an error processing your message.', role: 'bot' }];
    } finally {
      isLoading = false;
    }
  }

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }

  function autoGrow(e) {
    const textarea = e.target;
    textarea.style.height = '2rem'; // reset first
    const newHeight = Math.min(textarea.scrollHeight, 6 * 24);
    textarea.style.height = newHeight + 'px';
  }
</script>

<svelte:head>
	<title>Chatbot | Crustdata</title>
	<meta name="description" content="Ask queries about Crustdata's APIs" />
</svelte:head>

<div class="h-screen w-full bg-slate-50 flex items-center justify-center p-4">
  <div class="w-full max-w-[95%] bg-white rounded-lg shadow-lg flex flex-col h-full">
    <header class="bg-indigo-600 text-white p-4 rounded-t-lg">
      <h2 class="text-xl font-semibold">
        Customer Support Agent
      </h2>
      <p class="text-slate-300">
        Ask us anything about our APIs
      </p>
    </header>

    <main class="flex-1 overflow-y-auto p-4 space-y-4">
      {#if messages.length}
        {#each messages as message}
          <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="message-wrapper max-w-[60%] md:max-w-[50%] rounded-lg p-3 message-content
              {message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}">
              {@html message.content}
            </div>
          </div>
        {/each}
      {:else}
        <p class="text-lg text-center text-slate-600 mt-6">
          No messages yet. Start a conversation!
        </p>
      {/if}
    </main>

    <form onsubmit={handleSendMessage} class="border-t border-slate-200 p-4">
      <div class="flex gap-4">
        <textarea
          oninput={autoGrow}
          onkeydown={handleKeydown}
          bind:value={inputMessage}
          bind:this={inputEl}
          placeholder="Type your query..."
          rows="1"
          disabled={isLoading}
          class="flex-1 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none min-h-12 placeholder-slate-400"
        ></textarea>
        <button 
          type="submit"
          disabled={isLoading} 
          class="bg-indigo-600 text-white px-4 sm:px-6 py-2 rounded-lg flex items-center hover:bg-indigo-500 
          transition-colors duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          <Icon class="mr-1" icon={isLoading ? "eos-icons:loading" : "ant-design:send-outlined"} width="20" height="20" />
          <span class="hidden sm:inline">
            {isLoading ? 'Sending...' : 'Send'}
          </span>
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .message-wrapper {
    width: 100%;
  }
  :global(.message-content p) {
    margin: 0.5rem 0;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  :global(.message-content p:first-child) {
    margin-top: 0;
  }
  :global(.message-content p:last-child) {
    margin-bottom: 0;
  }
  :global(.message-content pre) {
    margin: 0.5rem -0.75rem; /* Negative margin to extend to edges */
    background: #f8f9fa;
    border-radius: 0.5rem;
  }
  :global(.message-content pre code) {
    display: block;
    overflow-x: auto;
    padding: 1rem 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre;
    -webkit-overflow-scrolling: touch;
  }
  :global(.message-content code:not(pre code)) {
    background: #f1f3f5;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875em;
    white-space: normal;
    word-wrap: break-word;
  }
  :global(.message-content pre code) {
    color: #1a1a1a;
  }
  :global(.message-content pre code::-webkit-scrollbar) {
    height: 4px;
  }
  :global(.message-content pre code::-webkit-scrollbar-track) {
    background: #f1f3f5;
    border-radius: 2px;
  }
  :global(.message-content pre code::-webkit-scrollbar-thumb) {
    background: #d1d5db;
    border-radius: 2px;
  }
  :global(.message-content pre code::-webkit-scrollbar-thumb:hover) {
    background: #9ca3af;
  }
</style>