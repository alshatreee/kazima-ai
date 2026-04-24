<?php
/**
 * Topics Module — Single Article View
 * WebsiteBaker 2.10 / kazima.org
 *
 * Loaded by view.php when TOPIC_ID is defined.
 * Table: wb_mod_topics (section_id = 618)
 */

if (!defined('WB_PATH')) die('Access denied');

// Fetch topic
$topic_id = intval(TOPIC_ID);
$query = $database->query(
    "SELECT t.topic_id, t.title, t.content_long, t.content_short,
            t.picture, t.link, t.published_when, t.posted_modified,
            t.author, t.option_id, t.views, t.keywords,
            o.option_name
     FROM " . TABLE_PREFIX . "mod_topics t
     LEFT JOIN " . TABLE_PREFIX . "mod_bakery_options o
          ON t.option_id = o.option_id
     WHERE t.topic_id = $topic_id AND t.active = 4
     LIMIT 1"
);

if (!$query || $query->numRows() === 0) {
    echo '<div style="text-align:center;padding:4rem 1rem;color:#ECF0F1;">
            <h2>المقال غير موجود</h2>
            <a href="'.WB_URL.'" style="color:#D4AC0D;">العودة للرئيسية</a>
          </div>';
    return;
}

$topic = $query->fetchRow(MYSQLI_ASSOC);

// Update view count
$database->query(
    "UPDATE " . TABLE_PREFIX . "mod_topics SET views = views + 1 WHERE topic_id = $topic_id"
);

// Format date
$date = date('j F Y', $topic['published_when'] ?: $topic['posted_modified']);

// Category name
$category = !empty($topic['option_name']) ? $topic['option_name'] : '';

// Keywords
$tags = array_filter(array_map('trim', explode(',', $topic['keywords'])));
?>

<style>
.kz-article {
    max-width: 52rem;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    direction: rtl;
}

.kz-article-back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: #D4AC0D;
    text-decoration: none;
    margin-bottom: 1.5rem;
}
.kz-article-back:hover { text-decoration: underline; }

.kz-article-category {
    display: inline-block;
    background: rgba(212, 172, 13, 0.15);
    color: #D4AC0D;
    font-size: 0.78rem;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    border: 1px solid rgba(212, 172, 13, 0.25);
    margin-bottom: 0.75rem;
}

.kz-article h1 {
    font-family: 'Amiri', 'Noto Naskh Arabic', 'Palatino Linotype', serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #D4AC0D;
    line-height: 1.5;
    margin: 0 0 0.75rem;
}

.kz-article-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.85rem;
    color: #8899A6;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(236, 240, 241, 0.1);
}
.kz-article-meta span::before {
    content: '·';
    margin: 0 0.3rem;
    color: rgba(236, 240, 241, 0.2);
}
.kz-article-meta span:first-child::before { display: none; }

.kz-article-author {
    color: #D4AC0D !important;
    text-decoration: none;
    font-weight: 500;
}
.kz-article-author:hover { text-decoration: underline; }

.kz-article-image {
    border-radius: 0.75rem;
    overflow: hidden;
    margin-bottom: 2rem;
    border: 1px solid rgba(236, 240, 241, 0.1);
}
.kz-article-image img {
    width: 100%;
    height: auto;
    display: block;
}

.kz-article-body {
    font-size: 1.05rem;
    line-height: 2.2;
    color: #ECF0F1;
}
.kz-article-body p {
    margin-bottom: 1.25rem;
}
.kz-article-body img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
}
.kz-article-body h2,
.kz-article-body h3 {
    color: #D4AC0D;
    margin: 1.5rem 0 0.75rem;
}
.kz-article-body a {
    color: #D4AC0D;
}
.kz-article-body blockquote {
    border-right: 3px solid #D4AC0D;
    padding: 0.5rem 1rem;
    margin: 1rem 0;
    background: rgba(212, 172, 13, 0.06);
    border-radius: 0 0.5rem 0.5rem 0;
}

.kz-article-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(236, 240, 241, 0.1);
}
.kz-article-tag {
    display: inline-block;
    background: rgba(236, 240, 241, 0.08);
    color: #8899A6;
    font-size: 0.78rem;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgba(236, 240, 241, 0.1);
}

.kz-article-info {
    margin-top: 2rem;
    padding: 1.25rem;
    background: rgba(236, 240, 241, 0.04);
    border: 1px solid rgba(236, 240, 241, 0.08);
    border-radius: 0.75rem;
}
.kz-article-info dt {
    display: inline;
    color: #8899A6;
    font-size: 0.85rem;
}
.kz-article-info dd {
    display: inline;
    color: #ECF0F1;
    font-size: 0.85rem;
    margin: 0 0 0 0.25rem;
}
.kz-article-info .kz-info-row {
    margin-bottom: 0.4rem;
}

@media (max-width: 640px) {
    .kz-article { padding: 1rem 1rem 3rem; }
    .kz-article h1 { font-size: 1.4rem; }
    .kz-article-body { font-size: 0.95rem; }
}
</style>

<div class="kz-article">
    <a href="javascript:history.back()" class="kz-article-back">
        ← الرجوع
    </a>

    <?php if ($category): ?>
        <span class="kz-article-category"><?php echo htmlspecialchars($category); ?></span>
    <?php endif; ?>

    <h1><?php echo htmlspecialchars($topic['title']); ?></h1>

    <div class="kz-article-meta">
        <?php if (!empty($topic['author'])): ?>
            <span class="kz-article-author"><?php echo htmlspecialchars($topic['author']); ?></span>
        <?php endif; ?>
        <span><?php echo $date; ?></span>
        <span><?php echo number_format($topic['views']); ?> مشاهدة</span>
    </div>

    <?php if (!empty($topic['picture'])): ?>
        <div class="kz-article-image">
            <img src="<?php echo htmlspecialchars($topic['picture']); ?>"
                 alt="<?php echo htmlspecialchars($topic['title']); ?>">
        </div>
    <?php endif; ?>

    <div class="kz-article-body">
        <?php echo $topic['content_long'] ?: $topic['content_short']; ?>
    </div>

    <?php if (count($tags) > 0): ?>
        <div class="kz-article-tags">
            <?php foreach ($tags as $tag): ?>
                <span class="kz-article-tag"><?php echo htmlspecialchars($tag); ?></span>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
