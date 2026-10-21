/* ============================================
   HOSTEL CRAVINGS — features.js
   Cart · Checkout · Policies · Auth · WhatsApp
   Single clean file, fully wired, zero conflicts
   ============================================ */

(function () {
  "use strict";

  // Dynamic API URL: points to port 3000 when using Live Server or file://
  const API = (window.location.protocol === "file:" || (window.location.port && window.location.port !== "3000"))
    ? "http://localhost:3000/api"
    : "/api";

  const WA_NUMBER = "917095143825";

  /* ── 1. CART STORAGE & HELPERS ─────────────── */
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("hc_cart_items") || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem("hc_cart_items", JSON.stringify(items));
    refreshBadge();
    updateWaLink();
  }

  function cartTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  /* ── 2. TOAST NOTIFICATION ──────────────────── */
  function showToast(msg, isSuccess) {
    const old = document.getElementById("hc-toast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "hc-toast";
    toast.style.cssText = `
      position: fixed; bottom: 32px; right: 32px; z-index: 99999;
      background: #1a1a26; color: #f5f0e8;
      border: 1px solid ${isSuccess ? "rgba(34,197,94,0.6)" : "rgba(201,168,76,0.5)"};
      border-radius: 40px; padding: 13px 22px;
      font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600;
      box-shadow: 0 10px 32px rgba(0,0,0,0.5);
      display: flex; align-items: center; gap: 10px;
      transform: translateY(20px); opacity: 0;
      transition: all 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
    `;
    const iconColor = isSuccess ? "#22c55e" : "#c9a84c";
    const iconName  = isSuccess ? "ph:check-circle-bold" : "ph:cookie-bold";
    toast.innerHTML = `<iconify-icon icon="${iconName}" style="color:${iconColor};font-size:1.2rem;flex-shrink:0"></iconify-icon><span>${msg}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  /* ── 3. BADGE REFRESH ───────────────────────── */
  function refreshBadge() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const badge = document.getElementById("cart-badge");
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle("zero", count === 0);
    }

    const mobileBadge = document.querySelector(".mobile-cart-count");
    if (mobileBadge) {
      mobileBadge.textContent = count;
    }
  }

  /* ── 4. ADD TO CART HANDLER (EVENT DELEGATION) ─── */
  function initAddToCart() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".product-add-btn");
      if (!btn) return;

      const card = btn.closest(".product-card");
      if (!card) return;

      if (card.classList.contains("out-of-stock") || btn.hasAttribute("disabled")) {
        showToast("Sorry, this snack is currently out of stock!", false);
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      const nameEl = card.querySelector(".product-name");
      const priceEl = card.querySelector(".product-price");
      const imgEl = card.querySelector(".product-img-wrap img");

      const name = nameEl ? nameEl.textContent.trim() : "Hostel Snack";
      const priceText = priceEl ? priceEl.textContent : "49";
      const price = parseFloat(priceText.replace(/[^\d.]/g, "")) || 49;
      const img = imgEl ? (imgEl.src || imgEl.getAttribute("data-src") || "") : "";

      const maxStock = parseInt(btn.dataset.stock);
      const cart = getCart();
      const existing = cart.find(i => i.name === name);

      if (!isNaN(maxStock)) {
        if (maxStock <= 0) {
          showToast(`Sorry, ${name} is out of stock!`, false);
          return;
        }
        if (existing && existing.quantity >= maxStock) {
          showToast(`Only ${maxStock} in stock for ${name}!`, false);
          return;
        }
      }

      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ name, price, quantity: 1, img });
      }
      saveCart(cart);

      // Button feedback animation
      btn.style.background = "linear-gradient(135deg, #6ee7a0, #22c55e)";
      const icon = btn.querySelector("iconify-icon");
      if (icon) icon.setAttribute("icon", "ph:check-bold");

      setTimeout(() => {
        btn.style.background = "";
        if (icon) icon.setAttribute("icon", "ph:plus-bold");
      }, 1200);

      // Badge bounce
      const badge = document.getElementById("cart-badge");
      if (badge) {
        badge.style.transform = "scale(1.6)";
        badge.style.transition = "transform 0.2s cubic-bezier(0.34, 1.5, 0.64, 1)";
        setTimeout(() => { badge.style.transform = "scale(1)"; }, 250);
      }

      showToast(`${name} added to cart!`, true);

      // If cart is open, re-render
      if (cartModal && cartModal.classList.contains("open")) {
        renderCart();
      }
    });
  }

  /* ── 4b. DYNAMIC STORE PRODUCTS LOADER ──────── */
  function loadStoreProducts() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    fetch(API + "/orders/products")
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        const products = Array.isArray(data) ? data : (data && Array.isArray(data.products) ? data.products : []);
        if (!products || products.length === 0) {
          return; // keep existing static fallback if DB empty
        }

        const activeFilter = document.querySelector(".tab-btn.active")?.dataset.filter || "all";

        const defaultImgs = {
          instant: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=75&auto=format&fit=crop",
          biscuits: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=75&auto=format&fit=crop",
          chips: "https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&q=75&auto=format&fit=crop",
          sweet: "https://images.unsplash.com/photo-1549007953-2f2dc0b24019?w=600&q=75&auto=format&fit=crop",
          drinks: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=75&auto=format&fit=crop"
        };

        const defaultDescs = {
          instant: "Ready in 2 minutes. The undisputed king of midnight cravings.",
          biscuits: "Crispy, sweet, and comforting for late-night study sessions.",
          chips: "Bold crunch and savory spices to crush late night hunger.",
          sweet: "Velvety sweetness and chocolate bliss for your sweet tooth.",
          drinks: "Chilled and refreshing fuel to keep you awake till dawn."
        };

        grid.innerHTML = products.map(p => {
          const qty = (p.quantity !== undefined && p.quantity !== null) ? Number(p.quantity) : (p.in_stock ? 20 : 0);
          const isOut = (p.in_stock === 0 || qty === 0);
          const isLow = (!isOut && qty > 0 && qty <= 5);

          let badgeHtml = '';
          if (isOut) {
            badgeHtml = '<span class="product-badge badge-out">Out of Stock</span>';
          } else if (isLow) {
            badgeHtml = `<span class="product-badge badge-low">Only ${qty} Left</span>`;
          } else if (p.category === 'instant') {
            badgeHtml = '<span class="product-badge badge-hot">Hostel Fav</span>';
          } else if (p.category === 'biscuits') {
            badgeHtml = '<span class="product-badge badge-best">Best Seller</span>';
          } else if (p.category === 'sweet') {
            badgeHtml = '<span class="product-badge badge-best">Sweet Pick</span>';
          } else {
            badgeHtml = '<span class="product-badge badge-new">Popular</span>';
          }

          // Stock left indicator tag
          let stockTagHtml = '';
          if (isOut) {
            stockTagHtml = `
              <div class="product-stock-tag stock-out">
                <span class="stock-dot"></span>
                <span>Out of stock</span>
              </div>
            `;
          } else if (isLow) {
            stockTagHtml = `
              <div class="product-stock-tag stock-low">
                <span class="stock-dot"></span>
                <span>Only <strong>${qty}</strong> left in stock!</span>
              </div>
            `;
          } else {
            stockTagHtml = `
              <div class="product-stock-tag stock-available">
                <span class="stock-dot"></span>
                <span><strong>${qty}</strong> left in stock</span>
              </div>
            `;
          }

          const fallbackImg = defaultImgs[p.category] || defaultImgs.instant;
          const imgUrl = (p.image_url && p.image_url.trim()) ? p.image_url.trim() : fallbackImg;
          const desc = (p.description && p.description.trim()) ? p.description.trim() : (defaultDescs[p.category] || "Midnight snack essential for your hostel room.");

          const displayStyle = (activeFilter === "all" || p.category === activeFilter) ? "" : "display:none;";
          const stockClass = isOut ? " out-of-stock" : "";
          const btnDisabled = isOut ? ' disabled title="Out of stock"' : '';
          const btnIcon = isOut ? 'ph:prohibit-bold' : 'ph:plus-bold';

          // Clean title casing for product name
          const cleanName = p.name ? p.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Snack Item';

          return `
            <article class="product-card${stockClass}" data-category="${p.category || 'all'}" role="listitem" id="product-${p.id}" style="${displayStyle}">
              <div class="product-img-wrap">
                ${badgeHtml}
                <img src="${imgUrl}" alt="${cleanName}" loading="lazy" width="600" height="400" onerror="this.onerror=null;this.src='${fallbackImg}'" />
                <div class="product-overlay" aria-hidden="true"></div>
              </div>
              <div class="product-info">
                <h3 class="product-name">${cleanName}</h3>
                <p class="product-desc">${desc}</p>
                ${stockTagHtml}
                <div class="product-footer">
                  <div class="product-price">&#8377;${p.price} <small>/ item</small></div>
                  <button class="product-add-btn" aria-label="Add ${cleanName} to cart" id="add-btn-${p.id}" data-stock="${qty}" data-product-id="${p.id}"${btnDisabled}>
                    <iconify-icon icon="${btnIcon}" aria-hidden="true"></iconify-icon>
                  </button>
                </div>
              </div>
            </article>
          `;
        }).join("");
      })
      .catch(err => {
        console.warn("Could not load products from API, using fallback products", err);
      });
  }

  // Also refresh storefront products whenever user switches tabs back to main site
  window.addEventListener("focus", () => {
    loadStoreProducts();
  });

  /* ── 5. CART MODAL ──────────────────────────── */
  const cartModal = document.getElementById("cart-modal");
  const cartBtn   = document.getElementById("cart-btn");
  const mobileCartBtn = document.getElementById("mobile-cart-btn");
  const cartClose = document.getElementById("cart-modal-close");

  function openCart() {
    if (!cartModal) return;
    renderCart();
    prefillCheckout();
    checkAuthState();
    updateWaLink();
    cartModal.setAttribute("aria-hidden", "false");
    cartModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    if (!cartModal) return;
    cartModal.setAttribute("aria-hidden", "true");
    cartModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (cartBtn) cartBtn.addEventListener("click", openCart);
  if (mobileCartBtn) {
    mobileCartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const mm = document.getElementById("mobile-menu");
      if (mm) mm.classList.remove("open");
      const hmb = document.querySelector(".nav-hamburger");
      if (hmb) hmb.classList.remove("active");
      document.body.style.overflow = "";
      setTimeout(openCart, 250);
    });
  }
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartModal) {
    cartModal.addEventListener("click", (e) => {
      if (e.target === cartModal) closeCart();
    });
  }

  // Global helper for empty cart button
  window._closeCartAndBrowse = function () {
    closeCart();
    const prodSection = document.getElementById("products");
    if (prodSection) prodSection.scrollIntoView({ behavior: "smooth" });
  };

  /* ── 6. RENDER CART ITEMS ───────────────────── */
  function renderCart() {
    const list = document.getElementById("cart-items-list");
    const totalDisplay = document.getElementById("cart-total-display");
    if (!list) return;

    const cart = getCart();

    if (!cart.length) {
      list.innerHTML = `
        <div class="cart-empty">
          <iconify-icon icon="ph:shopping-bag-bold"></iconify-icon>
          <p style="font-weight:700;color:#2a1f12;font-size:1.1rem;margin-bottom:6px">Your cart is empty</p>
          <p style="font-size:.85rem;color:#8a7a6a;margin-bottom:18px">Explore tonight's menu and satisfy your craving!</p>
          <button type="button" class="btn" style="background:#2a1f12;color:#f5e8c8;border:none;border-radius:30px;padding:10px 22px;font-size:.85rem;font-weight:700;cursor:pointer" onclick="window._closeCartAndBrowse()">Browse Menu</button>
        </div>
      `;
      if (totalDisplay) totalDisplay.textContent = "₹0";
      return;
    }

    list.innerHTML = cart.map((item, idx) => {
      const imgHtml = item.img
        ? `<img src="${item.img}" alt="${item.name}" onerror="this.outerHTML='<span>🍪</span>'" />`
        : `<span>🍪</span>`;
      const subtotal = (item.price * item.quantity).toFixed(0);

      return `
        <div class="cart-item-row" id="cart-row-${idx}">
          <div class="cart-item-img">${imgHtml}</div>
          <div class="cart-item-info">
            <div class="cart-item-name" title="${item.name}">${item.name}</div>
            <div class="cart-item-each">₹${item.price} each</div>
          </div>
          <div class="cart-item-qty">
            <button type="button" class="cart-qty-btn" onclick="window._cDec(${idx})" aria-label="Decrease quantity">−</button>
            <span class="cart-qty-num">${item.quantity}</span>
            <button type="button" class="cart-qty-btn" onclick="window._cInc(${idx})" aria-label="Increase quantity">+</button>
          </div>
          <span class="cart-item-subtotal">₹${subtotal}</span>
          <button type="button" class="cart-item-del" onclick="window._cDel(${idx})" aria-label="Remove ${item.name}">
            <iconify-icon icon="ph:trash-bold"></iconify-icon>
          </button>
        </div>
      `;
    }).join("");

    if (totalDisplay) {
      totalDisplay.textContent = "₹" + cartTotal(cart);
    }
  }

  // Stepper global bindings
  window._cInc = function (i) {
    const c = getCart();
    if (c[i]) {
      c[i].quantity += 1;
      saveCart(c);
      renderCart();
    }
  };

  window._cDec = function (i) {
    const c = getCart();
    if (c[i]) {
      if (c[i].quantity > 1) {
        c[i].quantity -= 1;
      } else {
        c.splice(i, 1);
      }
      saveCart(c);
      renderCart();
    }
  };

  window._cDel = function (i) {
    const c = getCart();
    if (c[i]) {
      c.splice(i, 1);
      saveCart(c);
      renderCart();
    }
  };

  /* ── 7. PREFILL USER DATA ───────────────────── */
  function prefillCheckout() {
    try {
      const u = JSON.parse(localStorage.getItem("hc_user_data") || "{}");
      const nameInput = document.getElementById("co-name");
      const phoneInput = document.getElementById("co-phone");
      const roomInput = document.getElementById("co-room");

      if (nameInput && !nameInput.value && u.name) nameInput.value = u.name;
      if (phoneInput && !phoneInput.value && u.phone) phoneInput.value = u.phone;
      if (roomInput && !roomInput.value && (u.hostel_no || u.room_no)) {
        roomInput.value = [u.hostel_no, u.room_no].filter(Boolean).join(" ");
      }
    } catch {}
  }

  /* ── 8. DYNAMIC WHATSAPP ORDER LINK ────────── */
  function updateWaLink() {
    const waBtn = document.getElementById("cart-wa-order-btn");
    if (!waBtn) return;

    const cart = getCart();
    const name = (document.getElementById("co-name") || {}).value || "";
    const room = (document.getElementById("co-room") || {}).value || "";

    if (!cart.length) {
      waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi Hostel Cravings! I want to check tonight's snacks menu 🍪")}`;
      return;
    }

    const itemsSummary = cart.map(i => `• ${i.quantity}x ${i.name} (₹${i.price * i.quantity})`).join("\n");
    const total = cartTotal(cart);
    let msg = `Hi Hostel Cravings! I would like to order:\n\n${itemsSummary}\n\n*Total:* ₹${total}\n*Payment:* Cash on delivery`;
    if (name) msg += `\n*Name:* ${name}`;
    if (room) msg += `\n*Room/Hostel:* ${room}`;

    waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  // Update WhatsApp link when user types in checkout fields
  ["co-name", "co-phone", "co-room"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateWaLink);
  });

  /* ── 9. CHECKOUT SUBMISSION ─────────────────── */
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const cart = getCart();
      const errEl = document.getElementById("checkout-error");
      const btn = document.getElementById("checkout-submit-btn");

      if (errEl) errEl.textContent = "";

      if (!cart.length) {
        if (errEl) errEl.textContent = "Your cart is empty. Add items from the menu first.";
        return;
      }

      const total = cartTotal(cart);
      if (total < 30) {
        if (errEl) errEl.textContent = "Minimum order amount is ₹30.";
        return;
      }

      const name = ((document.getElementById("co-name") || {}).value || "").trim();
      const phone = ((document.getElementById("co-phone") || {}).value || "").trim();
      const room = ((document.getElementById("co-room") || {}).value || "").trim();
      const notes = ((document.getElementById("co-notes") || {}).value || "").trim();

      if (!name || !phone || !room) {
        if (errEl) errEl.textContent = "Please fill in your name, phone and room number.";
        return;
      }

      const token = localStorage.getItem("hc_token");
      if (!token) {
        closeCart();
        openLogin();
        const loginSub = document.getElementById("login-modal-sub");
        if (loginSub) {
          loginSub.innerHTML = "<span style='color:var(--gold-light);font-weight:700'>Please login or create an account to place your order 🍪</span>";
        }
        showToast("Please log in or sign up to complete your order!", false);
        return;
      }

      if (btn) {
        btn.textContent = "Placing order...";
        btn.disabled = true;
      }

      const headers = { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      };

      // Parse room & hostel gracefully
      const payload = {
        items: cart,
        guest_name: name,
        guest_phone: phone,
        room_no: room,
        hostel_no: room,
        delivery_type: room.toLowerCase().includes("12") ? "door" : "gate",
        payment_method: "cash",
        notes: notes
      };

      fetch(API + "/orders", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(result => {
        if (!result.ok) {
          if (errEl) errEl.textContent = result.data.error || "Order submission failed.";
          if (btn) {
            btn.textContent = "Place order (COD)";
            btn.disabled = false;
          }
          if (result.data.error && result.data.error.toLowerCase().includes("log in")) {
            closeCart();
            openLogin();
          }
          return;
        }

        if (btn) {
          btn.textContent = "Order Placed! 🚀";
          btn.style.background = "linear-gradient(180deg, #22c55e, #16a34a)";
        }

        saveCart([]);
        renderCart();

        setTimeout(() => {
          closeCart();
          showToast(result.data.message || "Order placed successfully! Delivering soon 🚀", true);
          if (btn) {
            btn.textContent = "Place order (COD)";
            btn.style.background = "";
            btn.disabled = false;
          }
          checkoutForm.reset();
          // Open My Orders modal automatically to track the order
          setTimeout(() => {
            openOrders();
          }, 500);
        }, 1100);
      })
      .catch(() => {
        if (errEl) {
          errEl.innerHTML = "Server offline — tap <strong style='color:#1eb954'>Order via WhatsApp</strong> below to order directly!";
        }
        if (btn) {
          btn.textContent = "Place order (COD)";
          btn.disabled = false;
        }
      });
    });
  }

  /* ── 10. POLICIES MODAL ─────────────────────── */
  const polModal = document.getElementById("policies-modal");
  const polBtn   = document.getElementById("policies-btn");
  const mobilePolBtn = document.getElementById("mobile-policies-btn");
  const polClose = document.getElementById("policies-modal-close");
  const polBottomClose = document.getElementById("policies-close-bottom");
  const cartPolLink = document.getElementById("cart-policies-link");
  const loginPolLink = document.getElementById("login-policies-link");

  function openPolicies() {
    if (!polModal) return;
    polModal.setAttribute("aria-hidden", "false");
    polModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closePolicies() {
    if (!polModal) return;
    polModal.setAttribute("aria-hidden", "true");
    polModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (polBtn) polBtn.addEventListener("click", openPolicies);
  if (mobilePolBtn) {
    mobilePolBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const mm = document.getElementById("mobile-menu");
      if (mm) mm.classList.remove("open");
      const hmb = document.querySelector(".nav-hamburger");
      if (hmb) hmb.classList.remove("active");
      document.body.style.overflow = "";
      setTimeout(openPolicies, 250);
    });
  }
  if (polClose) polClose.addEventListener("click", closePolicies);
  if (polBottomClose) polBottomClose.addEventListener("click", closePolicies);
  if (polModal) {
    polModal.addEventListener("click", (e) => {
      if (e.target === polModal) closePolicies();
    });
  }

  // Cross-modal policy links
  if (cartPolLink) {
    cartPolLink.addEventListener("click", () => {
      closeCart();
      setTimeout(openPolicies, 200);
    });
  }
  if (loginPolLink) {
    loginPolLink.addEventListener("click", (e) => {
      e.preventDefault();
      closeLogin();
      setTimeout(openPolicies, 200);
    });
  }

  // Footer policy links
  document.querySelectorAll(".footer-policy-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openPolicies();
    });
  });

  /* ── 11. LOGIN & REGISTER MODAL ───────────── */
  const loginModal = document.getElementById("login-modal");
  const loginBtn   = document.getElementById("login-btn");
  const loginClose = document.getElementById("login-modal-close");
  const passToggle = document.getElementById("pass-toggle");
  const loginForm  = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const authToggleBtn = document.getElementById("login-register-toggle-btn");
  const modalTitle = document.getElementById("login-modal-title");
  const modalSub   = document.getElementById("login-modal-sub");
  const toggleIcon = document.getElementById("toggle-auth-icon");
  const toggleText = document.getElementById("toggle-auth-text");

  let isRegisterMode = false;

  function setAuthMode(register) {
    isRegisterMode = register;
    const loginErr = document.getElementById("login-error");
    const regErr = document.getElementById("register-error");
    if (loginErr) loginErr.textContent = "";
    if (regErr) regErr.textContent = "";

    if (isRegisterMode) {
      if (modalTitle) modalTitle.textContent = "Create Account";
      if (modalSub) modalSub.textContent = "Join Hostel Cravings for faster 10-min midnight delivery";
      if (loginForm) loginForm.style.display = "none";
      if (registerForm) registerForm.style.display = "flex";
      if (toggleIcon) toggleIcon.setAttribute("icon", "ph:sign-in-bold");
      if (toggleText) toggleText.textContent = "Already have an account? Login";
    } else {
      if (modalTitle) modalTitle.textContent = "Welcome Back";
      if (modalSub) modalSub.textContent = "Login to track your orders & save your favourites";
      if (loginForm) loginForm.style.display = "flex";
      if (registerForm) registerForm.style.display = "none";
      if (toggleIcon) toggleIcon.setAttribute("icon", "ph:user-plus-bold");
      if (toggleText) toggleText.textContent = "Don't have account? Create new account";
    }
  }

  function openLogin() {
    if (!loginModal) return;
    setAuthMode(false);
    loginModal.setAttribute("aria-hidden", "false");
    loginModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLogin() {
    if (!loginModal) return;
    loginModal.setAttribute("aria-hidden", "true");
    loginModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (loginBtn) loginBtn.addEventListener("click", openLogin);
  if (loginClose) loginClose.addEventListener("click", closeLogin);
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) closeLogin();
    });
  }

  // Toggle between Login and Register
  if (authToggleBtn) {
    authToggleBtn.addEventListener("click", () => {
      setAuthMode(!isRegisterMode);
    });
  }

  if (passToggle) {
    passToggle.addEventListener("click", () => {
      const inp = document.getElementById("login-pass");
      const eye = document.getElementById("pass-eye");
      if (!inp) return;
      inp.type = (inp.type === "password") ? "text" : "password";
      if (eye) eye.setAttribute("icon", inp.type === "text" ? "ph:eye-slash-bold" : "ph:eye-bold");
    });
  }

  // Login form submission
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = ((document.getElementById("login-email") || {}).value || "").trim();
      const pass  = ((document.getElementById("login-pass") || {}).value || "").trim();
      const errEl = document.getElementById("login-error");
      const btn   = document.getElementById("login-submit-btn");

      if (errEl) errEl.textContent = "";
      if (!email || !pass) {
        if (errEl) errEl.textContent = "Please enter both email and password.";
        return;
      }

      if (btn) {
        btn.innerHTML = `<iconify-icon icon="ph:circle-notch-bold" style="animation:spin 1s linear infinite"></iconify-icon> Logging in...`;
        btn.disabled = true;
      }

      fetch(API + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(result => {
        if (!result.ok) {
          if (errEl) errEl.textContent = result.data.error || "Login failed.";
          if (btn) {
            btn.innerHTML = `<iconify-icon icon="ph:sign-in-bold"></iconify-icon> Login`;
            btn.disabled = false;
          }
          return;
        }

        localStorage.setItem("hc_token", result.data.token);
        localStorage.setItem("hc_user_data", JSON.stringify(result.data.user));

        if (btn) {
          btn.innerHTML = `<iconify-icon icon="ph:check-bold"></iconify-icon> Welcome, ${result.data.user.name}!`;
          btn.style.background = "linear-gradient(135deg, #6ee7a0, #22c55e)";
        }

        setTimeout(() => {
          closeLogin();
          showToast(`Welcome back, ${result.data.user.name}!`, true);
          checkAuthState();
          prefillCheckout();
          if (btn) {
            btn.innerHTML = `<iconify-icon icon="ph:sign-in-bold"></iconify-icon> Login`;
            btn.style.background = "";
            btn.disabled = false;
          }
          if (getCart().length > 0) {
            setTimeout(openCart, 350);
          }
        }, 900);
      })
      .catch(() => {
        if (errEl) errEl.textContent = "Server offline. Please ensure the local server is running.";
        if (btn) {
          btn.innerHTML = `<iconify-icon icon="ph:sign-in-bold"></iconify-icon> Login`;
          btn.disabled = false;
        }
      });
    });
  }

  // Register form submission
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name  = ((document.getElementById("reg-name")  || {}).value || "").trim();
      const email = ((document.getElementById("reg-email") || {}).value || "").trim();
      const phone = ((document.getElementById("reg-phone") || {}).value || "").trim();
      const room  = ((document.getElementById("reg-room")  || {}).value || "").trim();
      const pass  = ((document.getElementById("reg-pass")  || {}).value || "").trim();
      const errEl = document.getElementById("register-error");
      const btn   = document.getElementById("register-submit-btn");

      if (errEl) errEl.textContent = "";

      if (!name || !email || !pass) {
        if (errEl) errEl.textContent = "Name, email and password are required.";
        return;
      }
      if (pass.length < 4) {
        if (errEl) errEl.textContent = "Password must be at least 4 characters.";
        return;
      }

      if (btn) {
        btn.innerHTML = `<iconify-icon icon="ph:circle-notch-bold" style="animation:spin 1s linear infinite"></iconify-icon> Creating account...`;
        btn.disabled = true;
      }

      fetch(API + "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone,
          password: pass,
          hostel_no: room,
          room_no: room
        })
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(result => {
        if (!result.ok) {
          if (errEl) errEl.textContent = result.data.error || "Registration failed.";
          if (btn) {
            btn.innerHTML = `<iconify-icon icon="ph:user-plus-bold"></iconify-icon> Create Account`;
            btn.disabled = false;
          }
          return;
        }

        localStorage.setItem("hc_token", result.data.token);
        localStorage.setItem("hc_user_data", JSON.stringify(result.data.user));

        if (btn) {
          btn.innerHTML = `<iconify-icon icon="ph:check-bold"></iconify-icon> Welcome, ${result.data.user.name}!`;
          btn.style.background = "linear-gradient(135deg, #6ee7a0, #22c55e)";
        }

        setTimeout(() => {
          closeLogin();
          showToast(`Welcome to Hostel Cravings, ${result.data.user.name}! 🎉`, true);
          checkAuthState();
          prefillCheckout();
          if (btn) {
            btn.innerHTML = `<iconify-icon icon="ph:user-plus-bold"></iconify-icon> Create Account`;
            btn.style.background = "";
            btn.disabled = false;
          }
          registerForm.reset();
          setAuthMode(false);
          if (getCart().length > 0) {
            setTimeout(openCart, 350);
          }
        }, 900);
      })
      .catch(() => {
        if (errEl) errEl.textContent = "Server offline. Please ensure the local server is running.";
        if (btn) {
          btn.innerHTML = `<iconify-icon icon="ph:user-plus-bold"></iconify-icon> Create Account`;
          btn.disabled = false;
        }
      });
    });
  }

  /* ── 11b. MY ORDERS MODAL & TRACKING ────────── */
  const ordersModal = document.getElementById("orders-modal");
  const ordersClose = document.getElementById("orders-modal-close");
  const myOrdersBtn = document.getElementById("my-orders-btn");
  const mobileOrdersBtn = document.getElementById("mobile-orders-btn");
  const btnRefreshOrders = document.getElementById("btn-refresh-orders");
  const ordersContent = document.getElementById("orders-content");
  let ordersPollInterval = null;

  function openOrders() {
    const token = localStorage.getItem("hc_token");
    if (!token) {
      openLogin();
      const loginSub = document.getElementById("login-modal-sub");
      if (loginSub) {
        loginSub.innerHTML = "<span style='color:var(--gold-light);font-weight:700'>Login to view your placed orders &amp; live tracking 📦</span>";
      }
      showToast("Please log in to view your orders!", false);
      return;
    }

    if (!ordersModal) return;
    ordersModal.setAttribute("aria-hidden", "false");
    ordersModal.classList.add("open");
    document.body.style.overflow = "hidden";

    fetchMyOrders();

    // Live polling every 5 seconds while modal is open
    if (ordersPollInterval) clearInterval(ordersPollInterval);
    ordersPollInterval = setInterval(fetchMyOrders, 5000);
  }

  function closeOrders() {
    if (!ordersModal) return;
    ordersModal.setAttribute("aria-hidden", "true");
    ordersModal.classList.remove("open");
    document.body.style.overflow = "";
    if (ordersPollInterval) {
      clearInterval(ordersPollInterval);
      ordersPollInterval = null;
    }
  }

  function fetchMyOrders(isManual = false) {
    const token = localStorage.getItem("hc_token");
    if (!token) {
      closeOrders();
      return;
    }

    if (btnRefreshOrders && isManual) {
      btnRefreshOrders.classList.add("spinning");
    }

    fetch(API + "/orders/my", {
      headers: { "Authorization": "Bearer " + token }
    })
    .then(res => {
      if (res.status === 401) {
        localStorage.removeItem("hc_token");
        localStorage.removeItem("hc_user_data");
        checkAuthState();
        closeOrders();
        showToast("Session expired. Please log in again.", false);
        openLogin();
        throw new Error("Unauthorized");
      }
      return res.json();
    })
    .then(orders => {
      if (btnRefreshOrders) {
        setTimeout(() => btnRefreshOrders.classList.remove("spinning"), 600);
      }
      renderMyOrders(orders);
    })
    .catch(err => {
      if (btnRefreshOrders) btnRefreshOrders.classList.remove("spinning");
      if (err.message !== "Unauthorized") {
        console.warn("Could not fetch orders", err);
      }
    });
  }

  function renderMyOrders(orders) {
    if (!ordersContent) return;

    if (!Array.isArray(orders) || orders.length === 0) {
      ordersContent.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon">
            <iconify-icon icon="ph:cookie-bold"></iconify-icon>
          </div>
          <h3 class="orders-empty-title">No orders placed yet</h3>
          <p class="orders-empty-desc">Your late-night cravings history will appear here once you place an order.</p>
          <button type="button" class="orders-empty-btn" id="btn-browse-menu">
            Explore Tonight's Menu
          </button>
        </div>
      `;
      const browseBtn = document.getElementById("btn-browse-menu");
      if (browseBtn) {
        browseBtn.addEventListener("click", () => {
          closeOrders();
          const prodSection = document.getElementById("products");
          if (prodSection) prodSection.scrollIntoView({ behavior: "smooth" });
        });
      }
      return;
    }

    const statusConfig = {
      pending: { label: "Order Placed", badgeClass: "os-pending", step: 1, text: "Awaiting confirmation from store owner" },
      accepted: { label: "Accepted & Preparing", badgeClass: "os-accepted", step: 2, text: "Owner confirmed! Packing your snacks now" },
      out_for_delivery: { label: "Out for Delivery", badgeClass: "os-out_for_delivery", step: 3, text: "Rider on the way to your hostel room 🛵" },
      delivered: { label: "Delivered", badgeClass: "os-delivered", step: 4, text: "Delivered! Enjoy your late-night cravings 🎉" },
      cancelled: { label: "Cancelled", badgeClass: "os-cancelled", step: 0, text: "This order was cancelled" }
    };

    ordersContent.innerHTML = orders.map(ord => {
      const cfg = statusConfig[ord.status] || statusConfig.pending;
      const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleString('en-IN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
      }) : 'Recent';

      const progressWidth = cfg.step === 1 ? '16%' : cfg.step === 2 ? '50%' : cfg.step === 3 ? '82%' : cfg.step === 4 ? '100%' : '0%';

      let timelineHtml = '';
      if (ord.status !== 'cancelled') {
        timelineHtml = `
          <div class="order-timeline">
            <div class="order-timeline-progress" style="width: ${progressWidth}"></div>
            <div class="ot-step ${cfg.step >= 1 ? 'active' : ''} ${cfg.step === 1 ? 'current' : ''}">
              <div class="ot-dot"><iconify-icon icon="ph:check-bold"></iconify-icon></div>
              <span class="ot-label">Placed</span>
            </div>
            <div class="ot-step ${cfg.step >= 2 ? 'active' : ''} ${cfg.step === 2 ? 'current' : ''}">
              <div class="ot-dot"><iconify-icon icon="ph:check-bold"></iconify-icon></div>
              <span class="ot-label">Preparing</span>
            </div>
            <div class="ot-step ${cfg.step >= 3 ? 'active' : ''} ${cfg.step === 3 ? 'current' : ''}">
              <div class="ot-dot"><iconify-icon icon="ph:check-bold"></iconify-icon></div>
              <span class="ot-label">On Way</span>
            </div>
            <div class="ot-step ${cfg.step >= 4 ? 'active' : ''} ${cfg.step === 4 ? 'current' : ''}">
              <div class="ot-dot"><iconify-icon icon="ph:check-bold"></iconify-icon></div>
              <span class="ot-label">Delivered</span>
            </div>
          </div>
        `;
      }

      let itemsListHtml = '';
      if (Array.isArray(ord.items) && ord.items.length) {
        itemsListHtml = ord.items.map(it => `
          <div class="order-item-row">
            <span class="order-item-name">${it.name} <strong style="color:var(--text-muted)">× ${it.quantity}</strong></span>
            <span class="order-item-price">₹${it.price * it.quantity}</span>
          </div>
        `).join('');
      } else if (ord.items_summary) {
        itemsListHtml = `<div class="order-item-row"><span class="order-item-name">${ord.items_summary}</span></div>`;
      }

      return `
        <article class="order-card" id="order-card-${ord.id}">
          <div class="order-card-header">
            <div class="order-id-group">
              <span class="order-id-badge">Order #${ord.id}</span>
              <span class="order-date-text">· ${dateStr}</span>
            </div>
            <span class="order-status-badge ${cfg.badgeClass}">${cfg.label}</span>
          </div>

          <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">
            <iconify-icon icon="ph:info-bold" style="color:var(--gold);vertical-align:-1px"></iconify-icon> ${cfg.text}
          </p>

          ${timelineHtml}

          <div class="order-items-box">
            ${itemsListHtml}
          </div>

          <div class="order-card-footer">
            <div class="order-delivery-tag">
              <iconify-icon icon="ph:map-pin-bold" style="color:var(--gold)"></iconify-icon>
              <span>Room ${ord.room_no || '—'} · ${ord.delivery_type === 'door' ? 'Door Delivery' : 'Hostel Gate'}</span>
            </div>
            <div class="order-total-tag">
              Total: ₹${Number(ord.total || 0).toFixed(0)} <small style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">(Cash on Delivery)</small>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Orders listeners
  if (myOrdersBtn) myOrdersBtn.addEventListener("click", openOrders);
  if (mobileOrdersBtn) mobileOrdersBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const closeBtn = document.querySelector(".mobile-menu-close");
    if (closeBtn) closeBtn.click();
    openOrders();
  });
  if (ordersClose) ordersClose.addEventListener("click", closeOrders);
  if (btnRefreshOrders) btnRefreshOrders.addEventListener("click", () => fetchMyOrders(true));
  if (ordersModal) ordersModal.addEventListener("click", (e) => {
    if (e.target === ordersModal) closeOrders();
  });

  // Cart auth notice button
  const cartAuthLoginBtn = document.getElementById("cart-auth-login-btn");
  if (cartAuthLoginBtn) {
    cartAuthLoginBtn.addEventListener("click", () => {
      closeCart();
      openLogin();
      const loginSub = document.getElementById("login-modal-sub");
      if (loginSub) {
        loginSub.innerHTML = "<span style='color:var(--gold-light);font-weight:700'>Login or create an account to place your order 🍪</span>";
      }
    });
  }

  // Logout buttons
  const logoutBtn = document.getElementById("logout-btn");
  const mobLogoutBtn = document.getElementById("mobile-logout-btn");
  function handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem("hc_token");
    localStorage.removeItem("hc_user_data");
    checkAuthState();
    closeOrders();
    showToast("You have been logged out.", true);
  }
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (mobLogoutBtn) mobLogoutBtn.addEventListener("click", (e) => {
    const closeBtn = document.querySelector(".mobile-menu-close");
    if (closeBtn) closeBtn.click();
    handleLogout(e);
  });

  const mobLoginBtn = document.getElementById("mobile-login-btn");
  if (mobLoginBtn) {
    mobLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const closeBtn = document.querySelector(".mobile-menu-close");
      if (closeBtn) closeBtn.click();
      openLogin();
    });
  }

  function checkAuthState() {
    const token = localStorage.getItem("hc_token");
    const lb = document.getElementById("login-btn");
    const ob = document.getElementById("my-orders-btn");
    const lob = document.getElementById("logout-btn");
    const mobOrders = document.getElementById("mobile-orders-btn");
    const mobLogin = document.getElementById("mobile-login-btn");
    const mobLogout = document.getElementById("mobile-logout-btn");
    const authNotice = document.getElementById("cart-auth-notice");
    const submitBtn = document.getElementById("checkout-submit-btn");

    if (token) {
      if (lb) lb.style.display = "none";
      if (ob) ob.style.display = "";
      if (lob) lob.style.display = "";
      if (mobOrders) mobOrders.style.display = "flex";
      if (mobLogout) mobLogout.style.display = "flex";
      if (mobLogin) mobLogin.style.display = "none";
      if (authNotice) authNotice.style.display = "none";
      if (submitBtn) submitBtn.innerHTML = "Place order (COD)";
    } else {
      if (lb) lb.style.display = "";
      if (ob) ob.style.display = "none";
      if (lob) lob.style.display = "none";
      if (mobOrders) mobOrders.style.display = "none";
      if (mobLogout) mobLogout.style.display = "none";
      if (mobLogin) mobLogin.style.display = "flex";
      if (authNotice) authNotice.style.display = "flex";
      if (submitBtn) submitBtn.innerHTML = "<iconify-icon icon='ph:lock-key-bold'></iconify-icon> Login &amp; Place Order";
    }
  }

  /* ── 12. ESC KEY TO CLOSE ANY MODAL ────────── */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (polModal && polModal.classList.contains("open")) closePolicies();
    if (cartModal && cartModal.classList.contains("open")) closeCart();
    if (loginModal && loginModal.classList.contains("open")) closeLogin();
    if (ordersModal && ordersModal.classList.contains("open")) closeOrders();
  });

  /* ── 13. INITIALIZATION ON DOM READY ────────── */
  function init() {
    refreshBadge();
    initAddToCart();
    loadStoreProducts();
    checkAuthState();
    updateWaLink();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
