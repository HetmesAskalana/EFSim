<script setup>
defineOptions({ inheritAttrs: false });

function retry() {
    window.location.reload();
}
</script>

<template>
    <div class="calculator-loading calculator-load-error" role="alert">
        <span>玩法加载失败，请检查网络后重试。</span>
        <button class="calculator-load-error__retry" type="button" @click="retry">
            刷新页面重试
        </button>
    </div>
</template>
