<script setup lang="ts">
// about：主页小卡片
import IconSvg from '../components/IconSvg.vue'
</script>

<template>
  <div class="wrap fade">
    <div class="sec-head">
      <span class="sec-icon"><IconSvg name="about" /></span>
      <div class="sec-sub">about</div>
    </div>

    <div class="profile-card fade">
      <span class="pf-avatar"><img :src="'/img/hanmoon-avatar.jpg'" alt="jyummy0_"></span>
      <div class="pf-name">jyummy0_</div>
      <div class="pf-bio">咋这么坏</div>
      <div class="pf-sub">你们没有在博客互关</div>
      <div class="pf-sub"><a href="mailto:8899city@gmail.com">8899city@gmail.com</a></div>
      <a class="pf-btn" href="https://github.com/gguioo" target="_blank" rel="noopener">查看主页</a>
    </div>
  </div>
  <div class="foot">© Jimmy · 手写于云端 · Wish me well</div>
</template>
