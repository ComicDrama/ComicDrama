<script setup lang="ts">
import { computed, ref } from 'vue';

const apiStatus = ref<'未检查' | '正常' | '异常'>('未检查');
const isChecking = ref(false);

const statusText = computed(() => {
  if (isChecking.value) return '检查中…';
  return apiStatus.value;
});

async function checkApi() {
  isChecking.value = true;
  try {
    const response = await fetch('/api/health');
    apiStatus.value = response.ok ? '正常' : '异常';
  } catch {
    apiStatus.value = '异常';
  } finally {
    isChecking.value = false;
  }
}
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">V1 可闭环 MVP</p>
        <h1>AI漫剧创作平台</h1>
        <p class="subtitle">从原文、剧本到分镜和成片的版本化创作工作台。</p>
      </div>
      <button class="button" type="button" @click="checkApi">检查 API</button>
    </header>

    <section class="grid">
      <article class="card">
        <span class="label">当前样本</span>
        <h2>《雨夜的灯》</h2>
        <p>1 集 · 都市奇幻 · 3～5 分钟</p>
      </article>
      <article class="card">
        <span class="label">基础服务</span>
        <h2>{{ statusText }}</h2>
        <p>通过 API 健康检查确认控制平面状态。</p>
      </article>
      <article class="card wide">
        <span class="label">生产链路</span>
        <div class="pipeline">
          <span>原文</span><b>→</b><span>剧本</span><b>→</b><span>分镜</span><b>→</b><span>资产</span><b>→</b><span>成片</span>
        </div>
      </article>
    </section>
  </main>
</template>

<style>
:root { color: #e9edf5; background: #10131a; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
.shell { max-width: 1120px; margin: 0 auto; padding: 72px 28px; }
.hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 42px; }
.eyebrow, .label { color: #8e9bb3; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 10px 0; font-size: clamp(36px, 7vw, 72px); line-height: 1; }
h2 { margin: 12px 0 8px; font-size: 24px; }
.subtitle, .card p { color: #9ca8bb; line-height: 1.7; }
.button { border: 1px solid #4b74ff; border-radius: 10px; padding: 12px 18px; color: #fff; background: #3359da; cursor: pointer; }
.button:hover { background: #4268ec; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.card { min-height: 166px; padding: 24px; border: 1px solid #252d3d; border-radius: 18px; background: #171c27; box-shadow: 0 20px 50px #080a0f66; }
.wide { grid-column: 1 / -1; }
.pipeline { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 28px; color: #b9c8ee; }
.pipeline span { padding: 8px 12px; border-radius: 8px; background: #232d43; }
.pipeline b { color: #7085bc; }
@media (max-width: 680px) { .hero { align-items: start; flex-direction: column; } .grid { grid-template-columns: 1fr; } .wide { grid-column: auto; } }
</style>