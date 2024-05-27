import {
  Button,
  Divider,
  Dropdown,
  Flex,
  GlobalToken,
  Popover,
  Space,
  Table,
  Tooltip,
  Typography,
  theme,
} from "antd";
import style from "./index.module.scss";
import { observer } from "mobx-react-lite";
import { Logo } from "@/components/Logo";
import { TableProps } from "antd/es/table";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CaretRightOutlined,
  CheckCircleFilled,
  ClearOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FolderAddOutlined,
  GithubOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageInput } from "@/components/ImageInput";
import { gstate } from "@/global";
import { CompressOption } from "@/components/CompressOption";
import { changeLang, langList } from "@/locale";
import { DefaultCompressOption, ImageItem, homeState } from "@/states/home";
import { Indicator } from "@/components/Indicator";
import {
  createDownload,
  formatSize,
  getFilesFromHandle,
  getOutputFileName,
  getUniqNameOnNames,
  wait,
} from "@/functions";
import { ProgressHint } from "@/components/ProgressHint";
import { UploadCard } from "@/components/UploadCard";
import { createImageList, useWorkerHandler } from "@/engines/transform";
import { toJS } from "mobx";
import { Compare } from "@/components/Compare";

/**
 * 获取当前语言字符串
 * @returns
 */
function getLangStr() {
  const findLang = langList?.find((item) => item?.key == gstate.lang);
  return (findLang as any)?.label;
}

function getColumns(token: GlobalToken, disabled: boolean) {
  const columns: TableProps<ImageItem>["columns"] = [
    {
      dataIndex: "status",
      title: gstate.locale?.columnTitle.status,
      fixed: "left",
      width: 80,
      className: style.status,
      render(_, row) {
        if (row.compress && row.preview) {
          return (
            <CheckCircleFilled
              style={{
                fontSize: "17px",
                color: token.colorPrimary,
              }}
            />
          );
        }
        return <Indicator />;
      },
    },
    {
      dataIndex: "preview",
      title: gstate.locale?.columnTitle.preview,
      render(_, row) {
        if (!row.preview) return <div className={style.preview} />;
        return (
          <div
            className={style.preview}
            style={{
              borderRadius: token.borderRadius,
            }}
          >
            <img src={row.preview.src} />
            {row.compress && (
              <Flex
                align="center"
                justify="center"
                onClick={async () => {
                  // gstate.loading = true;
                  // await wait(300);
                  homeState.compareId = row.key;
                }}
              >
                  <svg viewBox="0 0 24 24">
                  <path d="M13,23H11V1H13V23M9,19H5V5H9V3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.9,21 5,21H9V19M19,7V9H21V7H19M19,5H21C21,3.89 20.1,3 19,3V5M21,15H19V17H21V15M19,11V13H21V11H19M17,3H15V5H17V3M19,21C20.11,21 21,20.11 21,19H19V21M17,19H15V21H17V19Z" />
                </svg>
              </Flex>
            )}
          </div>
        );
      },
    },
    {
      dataIndex: "name",
      title: gstate.locale?.columnTitle.name,
      render(_, row) {
        return (
          <Typography.Text title={row.name} className={style.name}>
            {row.name}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "dimension",
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.dimension,
      render(_, row) {
        if (!row.width && !row.height) return "-";
        return (
          <Typography.Text type="secondary">
            {row.width}*{row.height}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "newDimension",
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.newDimension,
      render(_, row) {
        if (!row.compress?.width && !row.compress?.height) return "-";
        return (
          <Typography.Text>
            {row.compress.width}*{row.compress.height}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "size",
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.size,
      sorter(first, second) {
        return first.blob.size - second.blob.size;
      },
      render(_, row) {
        return (
          <Typography.Text type="secondary">
            {formatSize(row.blob.size)}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "newSize",
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.newSize,
      sorter(first, second) {
        if (!first.compress || !second.compress) {
          return 0;
        }
        return first.compress.blob.size - second.compress.blob.size;
      },
      render(_, row) {
        if (!row.compress) return "-";
        const lower = row.blob.size > row.compress.blob.size;
        const format = formatSize(row.compress.blob.size);
        if (lower) {
          return <Typography.Text type="success">{format}</Typography.Text>;
        }

        return <Typography.Text type="danger">{format}</Typography.Text>;
      },
    },
    {
      dataIndex: "decrease",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.decrease,
      align: "right",
      sorter(first, second) {
        if (!first.compress || !second.compress) {
          return 0;
        }
        const firstRate =
          (first.blob.size - first.compress.blob.size) / first.blob.size;
        const secondRate =
          (second.blob.size - second.compress.blob.size) / second.blob.size;

        return firstRate - secondRate;
      },
      render(_, row) {
        if (!row.compress) return "-";
        const lower = row.blob.size > row.compress.blob.size;
        const rate = (row.compress.blob.size - row.blob.size) / row.blob.size;
        const formatRate = (Math.abs(rate) * 100).toFixed(2) + "%";
        if (lower) {
          return (
            <Flex align="center" justify="flex-end">
              <Typography.Text type="success">
                {formatRate}&nbsp;
              </Typography.Text>
              <ArrowDownOutlined style={{ color: token.colorSuccess }} />
            </Flex>
          );
        }

        return (
          <Flex align="center" justify="flex-end">
            <Typography.Text type="danger">+{formatRate}&nbsp;</Typography.Text>
            <Tooltip title={gstate.locale?.optionPannel.failTip}>
              <ArrowUpOutlined
                style={{ color: token.colorError, cursor: "pointer" }}
              />
            </Tooltip>
          </Flex>
        );
      },
    },
    {
      dataIndex: "action",
      align: "right",
      fixed: "right",
      title: gstate.locale?.columnTitle.action,
      className: style.action,
      render(_, row) {
        return (
          <Space>
            <Typography.Link
              type="secondary"
              disabled={disabled}
              onClick={() => {
                homeState.list.delete(row.key);
              }}
            >
              <Tooltip title={gstate.locale?.listAction.removeOne}>
                <DeleteOutlined />
              </Tooltip>
            </Typography.Link>
            <Typography.Link
              type="secondary"
              disabled={disabled}
              onClick={() => {
                if (row.compress?.blob) {
                  const fileName = getOutputFileName(row, homeState.option);
                  createDownload(fileName, row.compress.blob);
                }
              }}
            >
              <Tooltip title={gstate.locale?.listAction.downloadOne}>
                <DownloadOutlined />
              </Tooltip>
            </Typography.Link>
          </Space>
        );
      },
    },
  ];

  return columns;
}

const Home = observer(() => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { token } = theme.useToken();

  const disabled = homeState.hasTaskRunning();
  const columns = getColumns(token, disabled);

  useWorkerHandler();

  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const [scrollHeight, setScrollHeight] = useState<number>(0);
  const resize = useCallback(() => {
    const element = scrollBoxRef.current;
    if (element) {
      const boxHeight = element.getBoundingClientRect().height;
      const th = document.querySelector(".ant-table-thead");
      const tbody = document.querySelector(".ant-table-tbody");
      const thHeight = th?.getBoundingClientRect().height ?? 0;
      const tbodyHeight = tbody?.getBoundingClientRect().height ?? 0;
      if (boxHeight > thHeight + tbodyHeight) {
        setScrollHeight(0);
      } else {
        setScrollHeight(boxHeight - thHeight);
      }
    }
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  // Everytime list change, recalc the scroll height
  useEffect(resize, [homeState.list.size]);

  useEffect(() => {
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  // Main content switch
  let mainContent = <UploadCard />;
  if (homeState.list.size > 0) {
    mainContent = (
      <>
        <Flex align="stretch" vertical className={style.content}>
          <Flex align="center" justify="space-between" className={style.menu}>
            <Space>
              <Button
                disabled={disabled}
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => {
                  fileRef.current?.click();
                }}
              >
                {gstate.locale?.listAction.batchAppend}
              </Button>
              {window.showDirectoryPicker && (
                <Button
                  disabled={disabled}
                  icon={<FolderAddOutlined />}
                  type="primary"
                  onClick={async () => {
                    const handle = await window.showDirectoryPicker!();
                    const result = await getFilesFromHandle(handle);
                    await createImageList(result);
                  }}
                >
                  {gstate.locale?.listAction.addFolder}
                </Button>
              )}
            </Space>
            <Space>
              <Tooltip title={gstate.locale?.listAction.reCompress}>
                <Button
                  disabled={disabled}
                  icon={<ReloadOutlined />}
                  onClick={async () => {
                    homeState.reCompress();
                  }}
                />
              </Tooltip>
              <Button
                disabled={disabled}
                icon={<ClearOutlined />}
                onClick={() => {
                  homeState.list.clear();
                }}
              >
                {gstate.locale?.listAction.clear}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                type="primary"
                disabled={disabled}
                onClick={async () => {
                  gstate.loading = true;
                  const jszip = await import("jszip");
                  const zip = new jszip.default();
                  const names: Set<string> = new Set();
                  /* eslint-disable @typescript-eslint/no-unused-vars */
                  for (const [_, info] of homeState.list) {
                    const fileName = getOutputFileName(info, homeState.option);
                    const uniqName = getUniqNameOnNames(names, fileName);
                    names.add(uniqName);
                    if (info.compress?.blob) {
                      zip.file(uniqName, info.compress.blob);
                    }
                  }
                  const result = await zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: {
                      level: 6,
                    },
                  });
                  createDownload("picsmaller.zip", result);
                  gstate.loading = false;
                }}
              >
                {gstate.locale?.listAction.downloadAll}
              </Button>
            </Space>
            <ImageInput ref={fileRef} />
          </Flex>
          <div ref={scrollBoxRef}>
            <Table
              columns={columns}
              size="small"
              pagination={false}
              scroll={scrollHeight ? { y: scrollHeight } : undefined}
              dataSource={Array.from(homeState.list.values())}
            />
          </div>
          <Flex align="center">
            <ProgressHint />
          </Flex>
        </Flex>
        <div className={style.side}>
          <Flex justify="space-between" align="center">
            <Popover
              placement="bottom"
              content={
                <div className={style.optionHelpBox}>
                  <Typography.Text>
                    {gstate.locale?.optionPannel.help}
                  </Typography.Text>
                </div>
              }
            >
              <Typography.Text type="secondary" className={style.optionHelp}>
                <ExclamationCircleOutlined />
              </Typography.Text>
            </Popover>
            <Space>
              <Button
                disabled={disabled}
                icon={<ReloadOutlined />}
                onClick={async () => {
                  homeState.tempOption = { ...DefaultCompressOption };
                  homeState.option = { ...DefaultCompressOption };
                  homeState.reCompress();
                }}
              >
                {gstate.locale?.optionPannel?.resetBtn}
              </Button>
              <Button
                disabled={disabled}
                icon={<CaretRightOutlined />}
                type="primary"
                onClick={() => {
                  homeState.option = toJS(homeState.tempOption);
                  homeState.reCompress();
                }}
              >
                {gstate.locale?.optionPannel?.confirmBtn}
              </Button>
            </Space>
          </Flex>
          <div>
            <CompressOption />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={style.container}>
      {/* header */}
      <Flex align="center" justify="space-between" className={style.header}>
        <div>
          <Logo title={gstate.locale?.logo} />
        </div>
        <Space>
          <Dropdown
            menu={{
              items: langList,
              selectedKeys: [gstate.lang],
              async onClick({ key }) {
                await wait(300);
                changeLang(key);
              },
            }}
          >
            <Flex className={style.locale} align="center">
              <svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M472.615 866.462h78.77v78.769h-78.77z" fill="#FFF"/><path d="M157.538 866.462h78.77v78.769h-78.77zm630.154 0h78.77v78.769h-78.77zm157.539-236.308H1024v78.77h-78.77zm0-78.77H1024v78.77h-78.77zm0-78.769H1024v78.77h-78.77zm0-78.769H1024v78.77h-78.77zm0-78.77H1024v78.77h-78.77zm-78.77 393.847h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M866.462 630.154h78.769v78.77h-78.77zm0-78.77h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.77h78.769v78.77h-78.77z" fill="#FF9343"/><path d="M866.462 236.308h78.769v78.769h-78.77zm0-78.77h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm-78.77 787.692h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M787.692 708.923h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M787.692 630.154h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M787.692 236.308h78.77v78.769h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M787.692 0h78.77v78.77h-78.77zm-78.769 787.692h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M708.923 708.923h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M708.923 630.154h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.768h78.77v78.769h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M708.923 78.77h78.77v78.768h-78.77zm-78.77 708.922h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M630.154 708.923h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M630.154 630.154h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M630.154 551.385h78.77v78.769h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M630.154 393.846h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M630.154 315.077h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M630.154 157.538h78.77v78.77h-78.77zm-78.77 630.154h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M551.385 708.923h78.769v78.77h-78.77z" fill="#FF9343"/><path d="M551.385 630.154h78.769v78.77h-78.77zm0-78.77h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.77h78.769v78.77h-78.77zm0-78.768h78.769v78.769h-78.77z" fill="#FFDD4D"/><path d="M551.385 157.538h78.769v78.77h-78.77zm-78.77 630.154h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M472.615 708.923h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M472.615 630.154h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M472.615 551.385h78.77v78.769h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M472.615 315.077h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M472.615 157.538h78.77v78.77h-78.77zm-78.769 630.154h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M393.846 708.923h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M393.846 630.154h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.768h78.77v78.769h-78.77z" fill="#FFDD4D"/><path d="M393.846 157.538h78.77v78.77h-78.77zm-78.77 630.154h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M315.077 708.923h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M315.077 630.154h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M315.077 551.385h78.77v78.769h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M315.077 393.846h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M315.077 315.077h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#FF9343"/><path d="M315.077 157.538h78.77v78.77h-78.77zm-78.77 630.154h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M236.308 708.923h78.769v78.77h-78.77z" fill="#FFF1B6"/><path d="M236.308 630.154h78.769v78.77h-78.77zm0-78.77h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.769h78.769v78.77h-78.77zm0-78.77h78.769v78.77h-78.77zm0-78.768h78.769v78.769h-78.77zm0-78.77h78.769v78.77h-78.77z" fill="#FFDD4D"/><path d="M236.308 78.77h78.769v78.768h-78.77zm-78.77 708.922h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M157.538 708.923h78.77v78.77h-78.77z" fill="#FFF1B6"/><path d="M157.538 630.154h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77zm0-78.77h78.77v78.77h-78.77z" fill="#FFDD4D"/><path d="M157.538 236.308h78.77v78.769h-78.77zm0-78.77h78.77v78.77h-78.77zm0-78.769h78.77v78.77h-78.77z" fill="#FFF1B6"/><path d="M157.538 0h78.77v78.77h-78.77zM78.77 708.923h78.77v78.77h-78.77z" fill="#1E2028"/><path d="M78.77 630.154h78.768v78.77H78.77zm0-78.77h78.768v78.77H78.77zm0-78.769h78.768v78.77H78.77zm0-78.769h78.768v78.77H78.77zm0-78.77h78.768v78.77H78.77z" fill="#FFF1B6"/><path d="M78.77 236.308h78.768v78.769H78.77zm0-78.77h78.768v78.77H78.77zm0-78.769h78.768v78.77H78.77zM78.77 0h78.768v78.77H78.77zM0 630.154h78.77v78.77H0zm0-78.77h78.77v78.77H0zm0-78.769h78.77v78.77H0zm0-78.769h78.77v78.77H0zm0-78.77h78.77v78.77H0zm157.538 630.155h78.77V1024h-78.77zm78.77 0h78.769V1024h-78.77zm78.769 0h78.77V1024h-78.77zm78.77 0h78.768V1024h-78.769z" fill="#1E2028"/><path d="M236.308 866.462h78.769v78.769h-78.77z" fill="#AAF2C7"/><path d="M315.077 866.462h78.77v78.769h-78.77zm78.77 0h78.768v78.769h-78.769zm157.538 0h78.769v78.769h-78.77zm78.769 0h78.77v78.769h-78.77z" fill="#60EF9A"/><path d="M708.923 866.462h78.77v78.769h-78.77z" fill="#38B269"/><path d="M472.615 945.23h78.77V1024h-78.77zm78.77 0h78.769V1024h-78.77zm78.769 0h78.77V1024h-78.77zm78.77 0h78.768V1024h-78.769zm78.768 0h78.77V1024h-78.77z" fill="#1E2028"/>
              </svg>
              <Typography.Text>{getLangStr()}</Typography.Text>
            </Flex>
          </Dropdown>
          <Divider type="vertical" style={{ background: "#dfdfdf" }} />
          <Typography.Link
            className={style.github}
            target="_blank"
            href="/"
          >
            <GithubOutlined />
          </Typography.Link>
        </Space>
      </Flex>

      {/* body */}
      <Flex align="stretch" className={style.main}>
        {mainContent}
      </Flex>

      {/* Compare */}
      {homeState.compareId !== null && <Compare />}
    </div>
  );
});

export default Home;
