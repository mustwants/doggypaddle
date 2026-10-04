// File: site/scripts/shop.js
// Shop page: shows curated picks that link out to other stores. There is no on-site checkout.

(function () {
  'use strict';

  const api = window.PupSwimApi;
  const site = window.PupSwimSite;
  const config = window.PupSwimConfig || {};
  const el = site.el;

  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  const SOURCE_LABELS = {
    amazon: 'Amazon', etsy: 'Etsy', printify: 'our merch store', shopify: 'our store', pupswim: 'PupSwim', other: 'the store'
  };

  const filters = document.getElementById('shop-filters');
  const loading = document.getElementById('shop-loading');
  const empty = document.getElementById('shop-empty');
  const content = document.getElementById('shop-content');
  const notice = document.getElementById('shop-notice');
  const disclosure = document.getElementById('amazon-disclosure');

  let items = [];
  let activeCategory = 'All';

  function card(item) {
    const isAmazon = item.source === 'amazon';
    const link = site.safeHttpsUrl(item.linkUrl);
    const image = item.imageUrl && (item.imageUrl.charAt(0) === '/' ? item.imageUrl : site.safeHttpsUrl(item.imageUrl));
    const media = el('div', { class: image ? 'pick-media' : 'pick-media pick-media-empty' }, image
      ? el('img', { src: image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' })
      : el('span', { text: item.category }));
    const meta = el('div', { class: 'pick-meta' }, [
      el('span', { class: 'badge', text: item.category }),
      item.priceText ? el('span', { class: 'badge badge-muted', text: item.priceText }) : null,
      isAmazon ? el('span', { class: 'badge badge-warn', text: 'paid link' }) : null
    ]);
    return el('article', { class: 'card pick' }, [
      media,
      el('div', { class: 'pick-body' }, [
        meta,
        el('h3', { text: item.name }),
        item.description ? el('p', { text: item.description }) : null,
        el('a', {
          class: 'btn btn-pool',
          href: link,
          target: '_blank',
          rel: isAmazon ? 'sponsored nofollow noopener' : 'noopener',
          text: 'View on ' + (SOURCE_LABELS[item.source] || 'the store')
        })
      ])
    ]);
  }

  function render() {
    site.clear(filters);
    const categories = ['All'].concat(items.map(function (i) { return i.category; }).filter(function (c, index, all) {
      return c && all.indexOf(c) === index;
    }));
    categories.forEach(function (category) {
      filters.appendChild(el('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(category === activeCategory),
        text: category,
        onclick: function () { activeCategory = category; render(); }
      }));
    });
    filters.hidden = categories.length <= 2;

    site.clear(grid);
    items.filter(function (item) {
      return activeCategory === 'All' || item.category === activeCategory;
    }).forEach(function (item) { grid.appendChild(card(item)); });
  }

  const merchUrl = site.safeHttpsUrl(config.MERCH_STORE_URL || '');
  if (merchUrl) {
    document.getElementById('merch-link').href = merchUrl;
    document.getElementById('merch-card').hidden = false;
  }

  api.get('getShopItems').then(function (result) {
    items = (result.items || []).filter(function (item) { return site.safeHttpsUrl(item.linkUrl); });
    loading.hidden = true;
    if (items.length === 0) {
      empty.hidden = false;
      return;
    }
    disclosure.hidden = !items.some(function (item) { return item.source === 'amazon'; });
    content.hidden = false;
    render();
  }).catch(function (error) {
    loading.hidden = true;
    site.setNotice(notice, 'bad', error.message);
  });
})();
