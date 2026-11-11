const revealItems = document.querySelectorAll(".reveal");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");
const caseTabs = document.querySelectorAll(".case-tab");
const casePanels = document.querySelectorAll(".case-gallery[data-case-panel]:not([data-case-panel='all'])");
const caseViewer = document.getElementById("case-viewer");
const caseViewerTitle = document.getElementById("case-viewer-title");
const caseViewerImage = document.getElementById("case-viewer-image");
const caseViewerPlaceholder = document.getElementById("case-viewer-placeholder");
const caseViewerCount = document.getElementById("case-viewer-count");
const caseViewerClose = document.querySelector(".case-viewer-close");
const caseViewerPrev = document.getElementById("case-viewer-prev");
const caseViewerNext = document.getElementById("case-viewer-next");
let activeGalleryImages = [];
let activeImageIndex = -1;
let activeCaseItems = [];
let activeCaseIndex = -1;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const updateLightboxImage = () => {
  if (!lightboxImage || activeImageIndex < 0 || !activeGalleryImages[activeImageIndex]) {
    return;
  }

  const image = activeGalleryImages[activeImageIndex];
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;

  const showNavigation = activeGalleryImages.length > 1;
  lightboxPrev?.classList.toggle("is-hidden", !showNavigation);
  lightboxNext?.classList.toggle("is-hidden", !showNavigation);
};

const openLightbox = (image) => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  const gallery = image.closest(".color-gallery");
  activeGalleryImages = gallery ? Array.from(gallery.querySelectorAll(".image-tile img")) : [image];
  activeImageIndex = Math.max(activeGalleryImages.indexOf(image), 0);
  updateLightboxImage();
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.style.overflow = "";
  activeGalleryImages = [];
  activeImageIndex = -1;
};

const showPreviousImage = () => {
  if (activeGalleryImages.length <= 1) {
    return;
  }

  activeImageIndex = (activeImageIndex - 1 + activeGalleryImages.length) % activeGalleryImages.length;
  updateLightboxImage();
};

const showNextImage = () => {
  if (activeGalleryImages.length <= 1) {
    return;
  }

  activeImageIndex = (activeImageIndex + 1) % activeGalleryImages.length;
  updateLightboxImage();
};

document.addEventListener("click", (event) => {
  const image = event.target.closest(".image-tile img");
  if (image) {
    openLightbox(image);
  }
});

const updateCaseViewer = () => {
  const item = activeCaseItems[activeCaseIndex];

  if (!item || !caseViewerImage || !caseViewerPlaceholder || !caseViewerCount) {
    return;
  }

  const isImage = item.tagName === "IMG";
  caseViewerImage.hidden = !isImage;
  caseViewerPlaceholder.hidden = isImage;

  if (isImage) {
    caseViewerImage.src = item.src;
    caseViewerImage.alt = item.alt;
  } else {
    caseViewerPlaceholder.textContent = item.textContent;
  }

  caseViewerCount.textContent = `${activeCaseIndex + 1} / ${activeCaseItems.length}`;
  caseViewerPrev.disabled = activeCaseItems.length <= 1;
  caseViewerNext.disabled = activeCaseItems.length <= 1;
};

const closeCaseViewer = () => {
  caseViewer?.classList.remove("is-open");
  caseViewer?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  activeCaseItems = [];
  activeCaseIndex = -1;
};

const moveCaseViewer = (direction) => {
  if (activeCaseItems.length <= 1) {
    return;
  }

  activeCaseIndex = (activeCaseIndex + direction + activeCaseItems.length) % activeCaseItems.length;
  updateCaseViewer();
};

caseTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedTab = tab.dataset.caseTab;
    const selectedPanel = document.querySelector(`[data-case-panel="${selectedTab}"]`);

    if (!selectedPanel || !caseViewer || !caseViewerTitle) {
      return;
    }

    caseTabs.forEach((item) => {
      item.classList.toggle("is-active", item === tab);
      item.setAttribute("aria-selected", String(item === tab));
    });

    activeCaseItems = [
      ...selectedPanel.querySelectorAll(".image-tile img"),
      ...selectedPanel.querySelectorAll(".case-placeholder"),
    ];
    activeCaseIndex = 0;
    caseViewerTitle.textContent = tab.textContent;
    updateCaseViewer();
    caseViewer.classList.add("is-open");
    caseViewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});

caseViewerClose?.addEventListener("click", closeCaseViewer);
caseViewerPrev?.addEventListener("click", () => moveCaseViewer(-1));
caseViewerNext?.addEventListener("click", () => moveCaseViewer(1));

caseViewer?.addEventListener("click", (event) => {
  if (event.target === caseViewer) {
    closeCaseViewer();
  }
});

const contactForm = document.querySelector(".contact-form");

document.addEventListener("managedphotosupdated", () => {
  closeLightbox();
  closeCaseViewer();
});

window.loadManagedPhotos();

let inquirySending = false;
const attachmentInput = document.getElementById("inquiry-files");
const attachmentSummary = document.getElementById("attachment-summary");
const clearAttachments = document.getElementById("clear-attachments");
const attachmentLimit = 10000000;

function validateAttachments() {
  const files = [...(attachmentInput?.files || [])];
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const allowed = /\.(pdf|jpe?g|png|webp|zip|dwg|dxf)$/i;
  let error = "";
  if (files.some(file => !allowed.test(file.name))) {
    error = "PDF, JPG, PNG, WebP, ZIP, DWG, DXF 파일을 선택해 주세요.";
  } else if (files.some(file => file.size === 0)) {
    error = "내용이 없는 파일은 첨부할 수 없습니다.";
  } else if (total > attachmentLimit) {
    error = "첨부파일의 합계 용량은 10MB 이하여야 합니다.";
  }
  attachmentInput?.setCustomValidity(error);
  if (attachmentSummary) {
    attachmentSummary.textContent = error || (files.length
      ? `${files.map(file => file.name).join(", ")} (${(total / 1000000).toFixed(2)}MB)` : "");
  }
  if (clearAttachments) clearAttachments.hidden = !files.length;
  return !error;
}

attachmentInput?.addEventListener("change", validateAttachments);
clearAttachments?.addEventListener("click", () => {
  attachmentInput.value = "";
  validateAttachments();
});

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (inquirySending) return;
  if (!validateAttachments()) {
    contactForm.reportValidity();
    return;
  }
  if (!window.confirm("전송하시겠습니까?")) return;

  const button = contactForm.querySelector(".submit-button");
  const status = contactForm.querySelector(".form-status");
  const originalLabel = button.textContent;
  const payload = new FormData(contactForm);
  const files = [...(attachmentInput?.files || [])];
  payload.delete("attachment");
  // Each file gets its own field, as required by the form service.
  files.forEach((file, index) => payload.append(index ? `attachment${index + 1}` : "attachment", file));
  const endpoint = new URL(contactForm.action);
  endpoint.pathname = `/ajax${endpoint.pathname}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), files.length ? 120000 : 30000);

  inquirySending = true;
  button.disabled = true;
  if (attachmentInput) attachmentInput.disabled = true;
  if (clearAttachments) clearAttachments.disabled = true;
  button.textContent = "전송 중…";
  contactForm.setAttribute("aria-busy", "true");
  status.textContent = "문의 내용을 전송하고 있습니다.";
  status.dataset.state = "sending";

  try {
    if (files.length) {
      await window.submitInquiryAttachments(contactForm.action, payload, controller.signal);
    } else {
      const response = await fetch(endpoint.href, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: payload,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !(result.success === true || result.success === "true")) {
        throw new Error("Inquiry was not accepted");
      }
    }
    status.textContent = "문의가 접수되었습니다. 확인 후 연락드리겠습니다.";
    status.dataset.state = "success";
    contactForm.reset();
    validateAttachments();
  } catch (error) {
    status.textContent = error.name === "AbortError"
      ? "전송 결과를 확인하지 못했습니다. 잠시 후 다시 시도하거나 aonespace@naver.com으로 연락해 주세요."
      : "전송하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도하거나 aonespace@naver.com으로 연락해 주세요.";
    status.dataset.state = "error";
  } finally {
    clearTimeout(timeout);
    inquirySending = false;
    button.disabled = false;
    if (attachmentInput) attachmentInput.disabled = false;
    if (clearAttachments) clearAttachments.disabled = false;
    button.textContent = originalLabel;
    contactForm.removeAttribute("aria-busy");
  }
});

lightboxClose?.addEventListener("click", closeLightbox);
lightboxPrev?.addEventListener("click", (event) => {
  event.stopPropagation();
  showPreviousImage();
});

lightboxNext?.addEventListener("click", (event) => {
  event.stopPropagation();
  showNextImage();
});

lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox?.classList.contains("is-open")) {
    closeLightbox();
  }

  if (event.key === "ArrowLeft" && lightbox?.classList.contains("is-open")) {
    showPreviousImage();
  }

  if (event.key === "ArrowRight" && lightbox?.classList.contains("is-open")) {
    showNextImage();
  }

  if (caseViewer?.classList.contains("is-open")) {
    if (event.key === "Escape") {
      closeCaseViewer();
    }

    if (event.key === "ArrowLeft") {
      moveCaseViewer(-1);
    }

    if (event.key === "ArrowRight") {
      moveCaseViewer(1);
    }
  }
});
