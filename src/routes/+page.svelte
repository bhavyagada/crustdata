<script>
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  
  let messages = $state([]);
  let inputMessage = $state("");
  let inputEl;

  onMount(() => inputEl.focus());
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    messages = [...messages, { text: inputMessage.trim(), sender: "user" }];
    inputMessage = "";
    
    // reset textarea height to default (3rem matches py-2 + text base line height)
    if (inputEl) inputEl.style.height = '2rem';
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
          <div class="flex {message.sender === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[60%] md:max-w-[50%] rounded-lg p-3 whitespace-pre-wrap
              {message.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}">
              {message.text}
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
          class="flex-1 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none min-h-12 placeholder-slate-400"
        ></textarea>
        <button 
          type="submit" 
          class="bg-indigo-600 text-white px-4 sm:px-6 py-2 rounded-lg flex items-center hover:bg-indigo-500 
          transition-colors duration-200"
        >
          <Icon class="mr-1" icon="ant-design:send-outlined" width="20" height="20" />
          <span class="hidden sm:inline">
            Send
          </span>
        </button>
      </div>
    </form>
  </div>
</div>
