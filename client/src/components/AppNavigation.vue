<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <v-bottom-navigation :model-value="route.path" color="primary" grow>
    <v-btn value="/" @click="navigate('/')">
      <v-icon>mdi-plus-circle-outline</v-icon>
      <span>Расход</span>
    </v-btn>

    <v-btn value="/expense-history" @click="navigate('/expense-history')">
      <v-icon>mdi-format-list-bulleted</v-icon>
      <span>История</span>
    </v-btn>

    <v-btn value="/statistics" @click="navigate('/statistics')">
      <v-icon>mdi-chart-pie-outline</v-icon>
      <span>Статистика</span>
    </v-btn>
  </v-bottom-navigation>
</template>