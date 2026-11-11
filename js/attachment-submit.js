// File submissions use the service's regular multipart endpoint, not its AJAX endpoint.
window.submitInquiryAttachments = (action, payload, signal) => new Promise((resolve, reject) => {
  const token = crypto.randomUUID();
  const frame = document.createElement("iframe");
  frame.name = `inquiry-${token}`;
  frame.hidden = true;
  frame.title = "문의 첨부파일 전송";
  const form = document.createElement("form");
  form.hidden = true;
  form.method = "POST";
  form.action = action;
  form.enctype = "multipart/form-data";
  form.target = frame.name;
  const callback = new URL("inquiry-complete.html", document.baseURI);

  function cleanup() {
    window.removeEventListener("message", onMessage);
    signal.removeEventListener("abort", onAbort);
    form.remove();
    frame.remove();
  }

  function onMessage(event) {
    // An iframe load alone does not establish success (it may be an error page).
    if (event.origin !== location.origin || event.source !== frame.contentWindow
      || event.data?.type !== "inquiry-complete") return;
    cleanup();
    resolve();
  }

  function onAbort() {
    cleanup();
    reject(new DOMException("Submission result was not confirmed", "AbortError"));
  }

  try {
    if (signal.aborted) return onAbort();
    payload.set("_next", callback.href);
    for (const [name, value] of payload) {
      const input = document.createElement("input");
      input.name = name;
      if (value instanceof File) {
        input.type = "file";
        const transfer = new DataTransfer();
        transfer.items.add(value);
        input.files = transfer.files;
      } else {
        input.type = "hidden";
        input.value = value;
      }
      form.append(input);
    }
    window.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort, { once: true });
    document.body.append(frame, form);
    HTMLFormElement.prototype.submit.call(form);
  } catch (error) {
    cleanup();
    reject(error);
  }
});
