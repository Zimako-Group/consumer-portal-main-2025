import React, { lazy, Suspense } from 'react';

const Chart = lazy(() => import('react-apexcharts'));

interface MessageMetrics {
  channel: string;
  value: number;
}

interface Props {
  data: MessageMetrics[];
}

const MessageDistributionChart: React.FC<Props> = ({ data }) => {
  const options = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: data.map((item) => item.channel),
    },
    yaxis: {
      title: {
        text: 'Messages',
      },
    },
    fill: {
      opacity: 1,
    },
    colors: ['#3b82f6', '#10b981', '#8b5cf6'],
    tooltip: {
      y: {
        formatter: (val: number) => val.toString(),
      },
    },
  };

  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <Chart
        options={options}
        series={[
          {
            name: 'Messages',
            data: data.map((item) => item.value),
          },
        ]}
        type="bar"
        height={350}
      />
    </Suspense>
  );
};

export default MessageDistributionChart;