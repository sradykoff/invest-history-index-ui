<template>
  <q-table
    flat
    bordered
    title="Instruments"
    selection="multiple"
    v-model:selected="selected"
    :rows="historyIndexList"
    :columns="columns"
    row-key="uid"
    :rows-per-page-options="[20, 30, 50, 100]"
    :filter="filter"
    :filter-method="filterMethod"
    style="min-width: 500px; width: 100%"
  >
    <template v-slot:top-right>
      <q-option-group
        dense
        inline
        v-model="filter.instrumentTypes"
        :options="allInstrumentTypes"
        color="green"
        type="checkbox"
        style="padding-right: 16pt"
      />
      <span>&nbsp;</span>
      <q-input
        bordered
        dense
        debounce="300"
        v-model="filter.text"
        placeholder="Search Ticker"
      >
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>
    </template>
    <template v-slot:top-left>
      <q-toolbar class="text-primary">
        <q-toolbar-title> </q-toolbar-title>
        <q-btn
          flat
          dense
          label="Сгенерировать скрипт"
          icon="file_download"
          :disable="selected.length < 1"
          @click="showDialog"
        />
      </q-toolbar>
    </template>

    <template v-slot:body="props">
      <q-tr :props="props" class="bg-grey-3">
        <q-td>
          <q-checkbox dense v-model="props.selected" :label="props.row.name" />
        </q-td>

        <q-td
          v-for="col in props.cols.filter(
            (col) => col.name !== 'selected' && col.name !== 'years'
          )"
          :key="col.name"
          :props="props"
        >
          {{ col.value }}
        </q-td>
        <q-td>
          <span
            class="q-pr-sm col col-md-3 col-sm-6 col-xs-12"
            v-ripple
            v-for="selectedLink in props.row.links"
            v-bind:key="selectedLink.year"
          >
            <a
              href="javascript:void(0)"
              :title="
                'Скачать архив ' + selectedLink.year + ' ' + props.row.ticker
              "
              @click.prevent="
                downloadRequest(
                  selectedLink.link,
                  selectedLink.year + '-' + props.row.ticker
                )
              "
              ><q-icon name="insert_drive_file" /> {{ selectedLink.year }}</a
            >
          </span>
        </q-td>
      </q-tr>
    </template>

    <!-- <template v-slot:item="props">
      <div
        class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition"
        :style="props.selected ? 'transform: scale(0.95);' : ''"
      >
        <q-card
          bordered
          flat
          :class="
            props.selected ? ($q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2') : ''
          "
        >
          <q-card-section>
            <q-checkbox
              dense
              v-model="props.selected"
              :label="props.row.name"
            />
          </q-card-section>
          <q-separator />
          <q-list dense>
            <q-item
              v-for="col in props.cols.filter((col) => col.name !== 'selected')"
              :key="col.name"
            >
              <q-item-section>
                <q-item-label>{{ col.label }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label caption>{{ col.value }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </template> -->
  </q-table>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, toRef, Ref } from 'vue';
import { HistoryData, InstrumentType, InstrumentTypeEnum } from './models';
import { useHistoryStore } from 'stores/history-index';
import { storeToRefs } from 'pinia';
import { api } from 'boot/axios';
import { useQuasar } from 'quasar';
import DownloadComponent from './DownloadComponent.vue';

function useClickCount() {
  const clickCount = ref(0);
  function increment() {
    clickCount.value += 1;
    return clickCount.value;
  }

  return { clickCount, increment };
}

function useDisplayTodo(
  historyIndex: Ref<HistoryData[]>,
  selectedInstruments: Ref<string[]>
) {
  const historyCount = computed(() => historyIndex.value.length);
  const selectedCount = computed(() => selectedInstruments.value.length);
  return { historyCount, selectedCount };
}

const filterMethod = (rows, terms, cols, cellValue) => {
  const lowerTerms = terms ? terms.text.toLowerCase() : '';
  const instrumentTypeSet = new Set(terms.instrumentTypes);
  return rows.filter((row) =>
    cols.some((col) => {
      const val = cellValue(col, row) + '';
      const haystack =
        val === 'undefined' || val === 'null' ? '' : val.toLowerCase();
      return (
        haystack.indexOf(lowerTerms) !== -1 &&
        instrumentTypeSet.has(row.instrumentType)
      );
    })
  );
};

export default defineComponent({
  name: 'ExampleComponent',
  props: {
    title: {
      type: String,
      required: true,
    },
    todos: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    meta: {
      type: Object as PropType<any>,
      required: true,
    },
    active: {
      type: Boolean,
    },
  },
  setup(props) {
    const $q = useQuasar();
    const historyStore = useHistoryStore();
    historyStore.loadHistoryIndex().then((unused) => void 0);
    let selected = ref([]);
    const { selectedHistory, historyIndexList } = storeToRefs(historyStore);
    const bashScript = computed(
      () =>
        '#!/bin/sh\n' +
        selected.value
          .flatMap((selectedVal) =>
            selectedVal?.years?.map(
              (year) =>
                `curl 'https://invest-public-api.tinkoff.ru/history-data?instrumentId=${selectedVal.uid}&year=${year}' --output ${selectedVal.uid}_${year}.zip`
            )
          )
          .join('\n')
    );

    function showDownloadDialog(selectedObjects: Ref<HistoryData[]>) {
      const showDialog = () => {
        $q.dialog({
          component: DownloadComponent,
          componentProps: {
            selected: selected.value,
          },
        })
          .onOk(() => {
            console.log('OK');
          })
          .onCancel(() => {
            console.log('Cancel');
          })
          .onDismiss(() => {
            console.log('Called on OK or Cancel');
          });
      };

      if (!historyStore.token || historyStore.token.trim().length < 1) {
        promptAuthToken(showDialog);
      } else {
        showDialog();
      }
    }

    async function downloadRequest(link: string, filename: string) {
      const downloadFunc = async () =>
        await api
          .get(link, {
            responseType: 'blob',
            headers: {
              Authorization: 'Bearer ' + historyStore.token,
            },
          })
          .then((response) => {
            // create file link in browser's memory
            const href = URL.createObjectURL(response.data);

            // create "a" HTML element with href to file & click
            const link = document.createElement('a');
            link.href = href;
            link.setAttribute('download', filename + '.zip'); //or any other extension
            document.body.appendChild(link);
            link.click();

            // clean up "a" element & remove ObjectURL
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
            $q.notify('Download done');
          });

      if (!historyStore.token || historyStore.token.trim().length < 1) {
        promptAuthToken(downloadFunc);
      } else {
        downloadFunc();
      }
    }

    function promptAuthToken(then) {
      $q.dialog({
        title: 'Prompt',
        message: 'Please input your tinkoff token',
        prompt: {
          model: '',
          isValid: (val) => val.length == 88, // << here is the magic
          type: 'password', // optional
        },
        cancel: true,
        persistent: true,
      }).onOk((data) => {
        // console.log('>>>> OK, received', data)
        historyStore.setAuthToken(data);
        if (then) then();
      });
    }

    return {
      ...useClickCount(),
      ...useDisplayTodo(historyIndexList, selectedHistory),
      historyIndexList,
      downloadRequest,
      filter: ref({
        text: '',
        instrumentTypes: [
          'bond',
          'share',
          'currency',
          'etf',
          'option',
          'futures',
        ],
      }),
      selected: selected,
      columns: [
        {
          name: 'instrumentType',
          required: true,
          label: 'Type',
          align: 'left',
          field: (row) => row.instrumentType,
          format: (val) => `${val}`,
          sortable: true,
        },
        {
          name: 'ticker',
          required: true,
          label: 'Ticker',
          align: 'left',
          field: (row) => row.ticker,
          format: (val) => `${val}`,
          sortable: true,
        },
        {
          name: 'tickerClassCode',
          required: true,
          label: 'Class code',
          align: 'left',
          field: (row) => row.tickerClassCode,
          format: (val) => `${val}`,
          sortable: true,
        },
        {
          name: 'years',
          required: true,
          label: 'Links',
          align: 'left',
          field: (row) => row.instrumentType + ' ' + row.years.join(', '),
          format: (val) => `${val}`,
          sortable: false,
        },
      ],
      bashScript,
      filterMethod,
      showDialog: () => showDownloadDialog(selected),
      allInstrumentTypes: [
        { label: 'Bonds', value: 'bond' },
        { label: 'Shares', value: 'share' },
        { label: 'Currencies', value: 'currency' },
        { label: 'Etfs', value: 'etf' },
        { label: 'Options', value: 'option' },
        { label: 'Fututres', value: 'futures' },
      ],
    };
  },
});
</script>
