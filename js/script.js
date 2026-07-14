const forms = document.querySelectorAll('[data-newsletter-form]');

const setStatus = (form, message, state = '') => {
  const status = form.querySelector('[data-form-status]');
  if (!status) return;

  status.textContent = message;
  status.className = `form-status${state ? ` is-${state}` : ''}`;
};

forms.forEach((form) => {
  const submitButton = form.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton?.textContent || 'Subscribe';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim().toLowerCase()
    };

    setStatus(form, 'Sending...', 'sending');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    try {
      const response = await fetch('/api/newsletter-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'The signup could not be completed right now.');
      }

      form.reset();
      setStatus(form, 'Thank you. Please check your inbox.', 'success');
    } catch (error) {
      setStatus(form, error.message || 'The signup could not be completed right now.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
});
