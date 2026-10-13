const path=require('node:path');
const nextWebpack=require('next/dist/compiled/webpack/webpack');nextWebpack.init();
const webpack=nextWebpack.webpack;
const root=path.resolve(__dirname,'..');
const mock=path.join(__dirname,'workflow-mocks.tsx');
webpack({
  mode:'production', devtool:false, entry:path.join(__dirname,'schedule-fixture.tsx'),
  output:{path:path.resolve(process.argv[2] || '.workflow-test'),filename:'schedule.js'},
  optimization:{minimize:false},
  resolve:{extensions:['.tsx','.ts','.js'],alias:{
    '@/lib/api-repository':mock, '@/lib/auth':mock, 'next/navigation':mock,
    'next/font/google':mock, 'next/image':mock, '@':path.join(root,'src'),
  }},
  module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,'workflow-ts-loader.cjs')},{test:/\.svg$/,type:'asset/inline'}]},
  plugins:[new webpack.DefinePlugin({'process.env.NEXT_PUBLIC_API_URL':JSON.stringify('/api')})],
},(error,stats)=>{
  if(error || stats.hasErrors()) {console.error(error || stats.toString({all:false,errors:true}));process.exitCode=1;}
  else console.log('Synthetic workflow bundle ready');
});
