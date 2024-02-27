<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <!--
        ...content
        ... use q-card-section for it?
      -->
      <!-- buttons example -->
      <q-card-actions align="right">
        <q-btn
          color="primary"
          label="Close"
          icon="close"
          @click="onCancelClick"
        />
      </q-card-actions>

      <q-card-section>
        <q-tabs v-model="tab" dense class="bg-orange text-white shadow-2">
          <q-tab name="download" label="download" />
          <q-tab name="bash" label="bash" />
          <q-tab name="cmd" label="cmd" />
        </q-tabs>

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="download">
            <div class="text-h6">Download links</div>
            <div class="q-pa-md">
              <div class="row" bordered separator>
                <div
                  class="q-pa-md col col-md-3 col-sm-6 col-xs-12"
                  v-ripple
                  v-for="selectedLink in selectedLinks"
                  v-bind:key="selectedLink.uid"
                >
                  <a
                    href="javascript:void(0)"
                    @click.prevent="
                      downloadRequest(
                        selectedLink.link,
                        selectedLink.year +
                          '-' +
                          selectedLink.historyData.ticker
                      )
                    "
                    ><q-icon name="insert_drive_file" />{{
                      selectedLink.historyData.name
                    }}
                    {{ selectedLink.year }}</a
                  >
                </div>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="bash">
            <div class="">
              <div class="text-h6">Bash script</div>
              <q-btn @click="copyToClipboard(bashScript)" icon="file_copy">
                <q-tooltip
                  anchor="center right"
                  self="center left"
                  :offset="[10, 10]"
                  >Copy to clipboard</q-tooltip
                >
              </q-btn>
              <prism-code language="bash">{{ bashScript }}</prism-code>
            </div>
          </q-tab-panel>
          <q-tab-panel name="cmd">
            <div class="text-h6">Windows cmd</div>
            <q-btn @click="copyToClipboard(cmdScript)" icon="file_copy">
              <q-tooltip
                anchor="center right"
                self="center left"
                :offset="[10, 10]"
                >Copy to clipboard</q-tooltip
              >
            </q-btn>
            <prism-code language="batch">{{ cmdScript }}</prism-code>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  computed,
  ref,
  toRef,
  Ref,
  onMounted,
} from 'vue';
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { useHistoryStore } from 'stores/history-index';
import { api } from 'boot/axios';
import { HistoryData } from './models';
import 'prismjs/themes/prism.css';
// import Prism from 'prismjs';
import PrismCode from './PrismCode.vue';

const toDowloadLink = (uid: string, year: number) =>
  `https://invest-public-api.tinkoff.ru/history-data?instrumentId=${uid}&year=${year}`;

export default {
  props: {
    selected: {
      type: Array as PropType<HistoryData[]>,
      default: () => [],
    },
    token: {
      type: Object as PropType<string>,
    },
  },

  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],

  components: { PrismCode },

  setup(props) {
    const $q = useQuasar();
    // REQUIRED; must be called inside of setup()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();
    // dialogRef      - Vue ref to be applied to QDialog
    // onDialogHide   - Function to be used as handler for @hide on QDialog
    // onDialogOK     - Function to call to settle dialog with "ok" outcome
    //                    example: onDialogOK() - no payload
    //                    example: onDialogOK({ /*.../* }) - with payload
    // onDialogCancel - Function to call to settle dialog with "cancel" outcome

    function copyToClipboard(text: string) {
      navigator.clipboard.writeText(text).then(() => {
        $q.notify('Copied to clipboard');
      });
    }

    const onBashUpdate = () => {
      // window.Prism = window.Prism || {};
      // window.Prism.manual = true;
      // Prism.highlightAll(); // highlight your code on mount
    };

    const historyStore = useHistoryStore();
    var token = ref(historyStore.token);

    const bashScript = computed(
      () =>
        '#!/bin/sh\n' +
        'load_array=(\n' +
        props.selected
          .flatMap((selectedVal) =>
            selectedVal?.years?.map(
              (year) =>
                `"${toDowloadLink(selectedVal.uid, year)}" "${
                  selectedVal.uid
                }_${year}.zip"`
            )
          )
          .join('\n') +
        '\n)\n' +
        `
TINK_TOKEN=${token.value}
num_cols=2
num_elements="\${#load_array[@]}"
num_rows="$(( $num_elements / 2 ))"
for ((row=0; row<num_rows; row++)); do
    i_url=$(( $row*$num_cols + 0 ))  # index of column 0
    i_file=$(( $row*$num_cols + 1 ))   # index of column 1
    url="\${load_array[$i_url]}"   # column 0
    file="\${load_array[$i_file]}"     # column 1
    echo 'start download '$url' '
    curl --header 'Authorization: Bearer '$TINK_TOKEN'' ''$url'' --output ''$file'' -s -w 'Total: %{time_total}s %{size_download} bytes'
    echo '..done'
    sleep 3
done
`
    );

    const cmdScript = computed(
      () =>
        `@echo off

    \n` +
        props.selected
          .flatMap((selectedVal) =>
            selectedVal?.years?.map(
              (year) =>
                `powershell -Command "Invoke-WebRequest -Headers @{'Authorization' = 'Bearer ${
                  token.value
                }'}  '${toDowloadLink(selectedVal.uid, year)}'  -OutFile '${
                  selectedVal.uid
                }_${year}.zip'"`
            )
          )
          .join('\n')
    );

    type SelectedYear = [string, number, HistoryData];
    type SelectedYearLink = {
      uid: string;
      year: number;
      historyData: HistoryData;
      link: string;
    };
    const selectedLinks = computed(() =>
      props.selected
        .flatMap((selectedVal) =>
          selectedVal?.years?.map(
            (year) => [selectedVal.uid, year, selectedVal] as SelectedYear
          )
        )
        .map(([uid, year, historyData]) => {
          const selecteLink: SelectedYearLink = {
            uid: uid,
            year: year,
            historyData: historyData,
            link: toDowloadLink(uid, year),
          };
          return selecteLink;
        })
    );

    async function downloadRequest(link: string, filename: string) {
      await api
        .get(link, {
          responseType: 'blob',
          headers: {
            Authorization: 'Bearer ' + token.value,
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
    }

    return {
      // This is REQUIRED;
      // Need to inject these (from useDialogPluginComponent() call)
      // into the vue scope for the vue html template
      dialogRef,
      onDialogHide,

      // other methods that we used in our vue html template;
      // these are part of our example (so not required)
      onOKClick() {
        // on OK, it is REQUIRED to
        // call onDialogOK (with optional payload)
        onDialogOK();
        // or with payload: onDialogOK({ ... })
        // ...and it will also hide the dialog automatically
      },

      // we can passthrough onDialogCancel directly
      onCancelClick: onDialogCancel,
      bashScript,
      cmdScript,
      copyToClipboard,
      tab: ref('download'),
      selectedLinks,
      downloadRequest,
      onBashUpdate,
    };
  },
};
</script>
