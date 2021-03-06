const fs = require('fs');
import isFileSupported from './utils/fiterSuffix'

/**
 * 判断一个path是否是文件夹
 */
const isDirectory = (path) => {
  return fs.lstatSync(path).isDirectory()
}

/**
 * 需要过滤的文件夹
 */
const filterDirs = [
  'assets',
  'components',
  'constants',
  'component',
  'enums',
  'css',
  'interceptors',
  'interface',
  'lib',
  'services',
  'styles',
  'utils'
]

/**
 * 数组去重
 * @param {*} weapp
 * @param {*} h5
 * @param {*} ctx
 * @param {*} pages
 * @param {*} path
 */
const handlePurifyArr = ({pages, subPackageItem, path}) => {
  // 去重
  if (pages.indexOf(path) === -1 && path) {
    // 拼接后的路由
    const sliceResPageRoute = path;

    subPackageItem = subPackageItem

    pages.push(sliceResPageRoute);
  }
}

/**
 * 扫描pages文件夹生成routes.js 即app.tsx中的pages配置项
 */
const getSubPackages = (ctx, options) => {
  return new Promise(resolve => {
    const {chalk} = ctx.helper;
    const {
      homeRoute,
      compSuffix,
      subPkgs,
      mainPkgs
    } = options;
    console.log(chalk.yellow('开始 '), '进入扫描分包插件');
    let excludesSubPackages: any[] = [];
    let includesSubPackages: any[] = []
    if (subPkgs.excludeDirs) {
      excludesSubPackages = subPkgs.excludeDirs;
    }
    if (subPkgs.includeDirs) {
      // 去重
      subPkgs.includeDirs.forEach(element => {
        if (!includesSubPackages.includes(element)) {
          includesSubPackages.push(element)
        }
      });
    }
    if (mainPkgs.excludeDirs) {
      // 去重
      mainPkgs.excludeDirs.forEach(element => {
        if (!includesSubPackages.includes(element)) {
          includesSubPackages.push(element)
        }
      });
    }
    let indexLines = '';
    const subPackages: any[] = [];
    const outerDirs = fs.readdirSync('./src');

    /**
     * 验证规则
     */
    const testFunc = (item: any) => {
      // 优先判断includes 如果没有includes则判断excludes
      if (includesSubPackages && includesSubPackages.length) {
        if (includesSubPackages.includes(item)) {
          return true
        }
      }
      if (excludesSubPackages && excludesSubPackages.length) {
        return !['.DS_Store', ...excludesSubPackages].includes(item)
      }
      return false
    }

    outerDirs.concat(includesSubPackages).forEach(item => {
      // 跳过特殊文件夹
      if (testFunc(item) && isDirectory(`./src/${item}`)) {
        console.log(chalk.magentaBright('读取 '), `发现分包 ${item}`);
        const subPackageItem: any = {};
        subPackageItem.root = item;
        subPackageItem.name = item;
        subPackageItem.pages = [];
        const innerDir = fs.readdirSync(`./src/${item}`);
        // 去除后缀名
        innerDir.forEach(inItem => {
          // 非页面文件夹过滤
          if (filterDirs.includes(inItem)) {
            return;
          }
          // 如果是文件夹则再次遍历
          if (isDirectory(`./src/${item}/${inItem}`)) {
            const deepInnerDir = fs.readdirSync(`./src/${item}/${inItem}`);
            deepInnerDir.forEach(deepInnerItem => {
              // 判断deepInnerItem为空时不做任何处理
              if (!deepInnerItem) {
                return
              }
              // 过滤文件类型
              if (!isFileSupported(deepInnerItem, compSuffix)) {
                return
              }
              if (filterDirs.includes(deepInnerItem)) {
                return;
              }
              const sliceRes = deepInnerItem.slice(0, deepInnerItem.indexOf('.'));
              // 数组去重
              handlePurifyArr({
                pages: subPackageItem.pages,
                subPackageItem: item,
                path: `${inItem}/${sliceRes}`
              });
            });
          }
          else {
            // 过滤文件类型
            if (!isFileSupported(inItem, compSuffix)) {
              return
            }
            const sliceRes = inItem.slice(0, inItem.indexOf('.'));
            handlePurifyArr({
              pages: subPackageItem.pages,
              subPackageItem: item,
              path: `${sliceRes}`
            });
          }
        });
        subPackages.push(subPackageItem);
      }
    });
    subPackages.forEach(item => {
      if (item !== homeRoute) {
        indexLines = indexLines ?
          `${indexLines}
  '${item}',` :
          `'${item}',`;
      }
    });
    indexLines = `${indexLines}

]

module.exports = pages`;

    console.log(`${chalk.blueBright('结束 ')}`, `分包页面扫描完成✅
    `)
    resolve(subPackages)
  });
};

export default getSubPackages